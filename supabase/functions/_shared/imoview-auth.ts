// Shared helper for Imoview App_* endpoints that require login (codigoacesso header).
// Login: GET /Usuario/App_ValidarAcesso?email=...&senha=<MD5> with header `chave`.
// codigoacesso is cached in worker memory and refreshed on 401/403.

import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const IMOVIEW_BASE = "https://api.imoview.com.br";

export type ImoviewSession = { codigoacesso: string; codigousuario: number | null };

type CacheEntry = ImoviewSession & { expiresAt: number };
let cached: CacheEntry | null = null;
const TTL_MS = 50 * 60 * 1000; // 50 min

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret: ${name}`);
  return v;
}

async function md5Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("MD5", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loginImoview(): Promise<ImoviewSession> {
  const chave = requireEnv("IMOVIEW_API_KEY");
  const email = requireEnv("IMOVIEW_USER_EMAIL");
  const senhaPlain = requireEnv("IMOVIEW_USER_PASSWORD");
  const senhaMd5 = await md5Hex(senhaPlain);

  const url = new URL(`${IMOVIEW_BASE}/Usuario/App_ValidarAcesso`);
  url.searchParams.set("email", email);
  url.searchParams.set("senha", senhaMd5);

  const res = await fetch(url.toString(), { method: "GET", headers: { chave } });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }

  if (!res.ok) throw new Error(`App_ValidarAcesso ${res.status}: ${text.slice(0, 300)}`);

  const codigoacesso =
    json?.codigoacesso ?? json?.codigoAcesso ?? json?.codigo_acesso ?? json?.codigo ?? null;
  if (!codigoacesso || typeof codigoacesso !== "string") {
    throw new Error(`App_ValidarAcesso sem codigoacesso. Resposta: ${text.slice(0, 300)}`);
  }
  const codigousuario =
    typeof json?.codigousuario === "number" ? json.codigousuario :
    typeof json?.codigoUsuario === "number" ? json.codigoUsuario : null;

  return { codigoacesso, codigousuario };
}

export async function getSession(force = false): Promise<ImoviewSession> {
  if (!force && cached && cached.expiresAt > Date.now()) {
    return { codigoacesso: cached.codigoacesso, codigousuario: cached.codigousuario };
  }
  const sess = await loginImoview();
  cached = { ...sess, expiresAt: Date.now() + TTL_MS };
  return sess;
}

export async function getCodigoAcesso(force = false): Promise<string> {
  return (await getSession(force)).codigoacesso;
}

export interface ImoviewAppFetchOptions {
  method?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function imoviewAppFetch(
  path: string,
  opts: ImoviewAppFetchOptions = {},
): Promise<{ status: number; data: any; raw: string }> {
  const chave = requireEnv("IMOVIEW_API_KEY");
  const method = opts.method ?? "GET";

  const url = new URL(`${IMOVIEW_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const doFetch = async (codigo: string) => {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        chave,
        codigoacesso: codigo,
        ...(opts.headers ?? {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const raw = await res.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { data = raw; }
    return { status: res.status, data, raw };
  };

  let codigo = await getCodigoAcesso();
  let result = await doFetch(codigo);

  // If unauthorized, force re-login once
  if (result.status === 401 || result.status === 403) {
    codigo = await getCodigoAcesso(true);
    result = await doFetch(codigo);
  }
  return result;
}
