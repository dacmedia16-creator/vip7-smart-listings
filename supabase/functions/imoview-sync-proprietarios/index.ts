// Sincroniza proprietários de imóveis do Imoview → tabelas `clientes` + `cliente_imoveis`.
// Para cada imóvel com `codigo_imoview`, tenta endpoints App_ que retornam os proprietários do imóvel.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IMOVIEW_API_KEY = Deno.env.get("IMOVIEW_API_KEY")!;
const IMOVIEW_API_URL = "https://api.imoview.com.br";
const IMOVIEW_APP_EMAIL = Deno.env.get("IMOVIEW_APP_EMAIL") || "";
const IMOVIEW_APP_SENHA = Deno.env.get("IMOVIEW_APP_SENHA") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 25; // imóveis processados por chunk
const CONCURRENCY = 4;
const INTER_BATCH_DELAY_MS = 250;

type Sb = ReturnType<typeof createClient>;
type Session = { codigoacesso: string; codigousuario: number };

// ---------- login App_ ----------
let cachedSession: Session | null = null;
async function loginApp(): Promise<Session> {
  if (cachedSession) return cachedSession;
  if (!IMOVIEW_APP_EMAIL || !IMOVIEW_APP_SENHA) throw new Error("IMOVIEW_APP_EMAIL/IMOVIEW_APP_SENHA não configurados");
  const url = new URL(`${IMOVIEW_API_URL}/Usuario/App_ValidarAcesso`);
  url.searchParams.set("email", IMOVIEW_APP_EMAIL);
  url.searchParams.set("senha", IMOVIEW_APP_SENHA);
  const res = await fetch(url.toString(), { method: "GET", headers: { chave: IMOVIEW_API_KEY } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`App_ValidarAcesso ${res.status}: ${txt.slice(0, 300)}`);
  const data = JSON.parse(txt);
  cachedSession = { codigoacesso: String(data.codigoacesso ?? ""), codigousuario: Number(data.codigousuario ?? 0) };
  if (!cachedSession.codigoacesso || !cachedSession.codigousuario) throw new Error(`Login Imoview falhou: ${txt.slice(0, 200)}`);
  return cachedSession;
}

async function imoviewApp(path: string, params: Record<string, string | number>): Promise<{ ok: boolean; status: number; data: unknown }> {
  const s = await loginApp();
  const url = new URL(`${IMOVIEW_API_URL}${path}`);
  url.searchParams.set("codigoUsuario", String(s.codigousuario));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  let res = await fetch(url.toString(), { headers: { chave: IMOVIEW_API_KEY, codigoacesso: s.codigoacesso } });
  if (res.status === 401 || res.status === 403) {
    cachedSession = null;
    const s2 = await loginApp();
    url.searchParams.set("codigoUsuario", String(s2.codigousuario));
    res = await fetch(url.toString(), { headers: { chave: IMOVIEW_API_KEY, codigoacesso: s2.codigoacesso } });
  }
  const txt = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(txt); } catch { /* texto puro */ }
  return { ok: res.ok, status: res.status, data };
}

// ---------- helpers ----------
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function asList(d: unknown): Record<string, unknown>[] {
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === "object") {
    const r = d as Record<string, unknown>;
    for (const k of ["proprietarios", "Proprietarios", "lista", "pessoas", "empresas", "clientes", "dados", "resultado", "items"]) {
      if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function pickCodigo(it: Record<string, unknown>): number {
  const v = it.codigo ?? it.Codigo ?? it.codigocliente ?? it.codigoCliente ?? it.CodigoCliente
    ?? it.codigopessoa ?? it.codigoPessoa ?? it.codigoempresa ?? it.codigoEmpresa ?? it.id ?? it.Id;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function mapClienteRow(raw: Record<string, unknown>) {
  const codigo = pickCodigo(raw);
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const v = raw[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
  };
  const cpf = get("cpf", "Cpf", "cnpj", "Cnpj", "cpfcnpj", "cpfCnpj", "CpfCnpj") || null;
  const isEmpresa = (cpf && cpf.replace(/\D/g, "").length > 11) || !!get("razaosocial", "razaoSocial", "RazaoSocial");
  const nome = get("nome", "Nome", "nomecompleto", "nomeCompleto", "NomeCompleto",
    "razaosocial", "razaoSocial", "RazaoSocial", "nomefantasia", "nomeFantasia", "NomeFantasia",
    "clienteNome", "ClienteNome") || `Cliente ${codigo}`;

  return {
    codigo,
    payload: {
      codigo_imoview: codigo,
      origem: "imoview",
      nome,
      tipo_pessoa: isEmpresa ? "juridica" : "fisica",
      cpf_cnpj: cpf,
      rg: get("rg", "Rg") || null,
      email: get("email", "Email", "clienteEmail", "ClienteEmail") || null,
      telefone: get("telefone", "Telefone", "celular", "Celular", "fone", "Fone", "telefoneCelular", "TelefoneCelular") || null,
      telefone_secundario: get("telefone2", "Telefone2", "telefoneComercial", "TelefoneComercial") || null,
      endereco: get("endereco", "Endereco") || null,
      numero: get("numero", "Numero") || null,
      complemento: get("complemento", "Complemento") || null,
      bairro: get("bairro", "Bairro") || null,
      cidade: get("cidade", "Cidade") || null,
      estado: get("estado", "Estado") || null,
      cep: get("cep", "Cep") || null,
      ativo: true,
      imoview_raw: raw,
    },
  };
}

function pickPercentual(it: Record<string, unknown>): number | null {
  const v = it.percentual ?? it.Percentual ?? it.percentualparticipacao ?? it.percentualParticipacao ?? it.PercentualParticipacao;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- discovery dos endpoints ----------
const ENDPOINT_CANDIDATES = [
  { path: "/Imovel/App_RetornarProprietariosImovel", param: "codigoImovel" },
  { path: "/Imovel/App_RetornarDetalhesImovel", param: "codigoImovel" },
  { path: "/Cliente/App_RetornarClientesImovel", param: "codigoImovel" },
] as const;

let resolvedEndpoint: (typeof ENDPOINT_CANDIDATES)[number] | null = null;

async function fetchProprietariosFor(codigoImovel: number): Promise<{ raws: Record<string, unknown>[]; endpoint: string | null }> {
  // Se já temos um endpoint que funcionou, usa direto
  const order = resolvedEndpoint ? [resolvedEndpoint, ...ENDPOINT_CANDIDATES.filter((e) => e !== resolvedEndpoint)] : [...ENDPOINT_CANDIDATES];
  for (const ep of order) {
    try {
      const { ok, data } = await imoviewApp(ep.path, { [ep.param]: codigoImovel });
      if (!ok) continue;
      let list: Record<string, unknown>[] = [];
      if (ep.path.includes("RetornarDetalhesImovel")) {
        const obj = (data && typeof data === "object") ? data as Record<string, unknown> : {};
        const arr = obj.proprietarios ?? obj.Proprietarios;
        if (Array.isArray(arr)) list = arr as Record<string, unknown>[];
      } else {
        list = asList(data);
      }
      if (list.length > 0) {
        if (!resolvedEndpoint) resolvedEndpoint = ep;
        return { raws: list, endpoint: ep.path };
      }
    } catch (e) {
      console.warn(`[sync-prop] ${ep.path} cod=${codigoImovel}: ${(e as Error).message}`);
    }
  }
  return { raws: [], endpoint: null };
}

// ---------- upsert ----------
async function upsertCliente(sb: Sb, raw: Record<string, unknown>): Promise<string | null> {
  const m = mapClienteRow(raw);
  if (!m.codigo) return null;

  const { data: existing } = await sb
    .from("clientes")
    .select("id, categorias, imoview_hash")
    .eq("codigo_imoview", m.codigo)
    .maybeSingle();

  const cats = new Set<string>(((existing as { categorias?: string[] } | null)?.categorias) || []);
  cats.add("proprietario");
  const payload = {
    ...m.payload,
    categorias: Array.from(cats),
    imoview_sync_at: new Date().toISOString(),
  };
  const hash = await sha256Hex(JSON.stringify(payload));

  if (existing) {
    const ex = existing as { id: string; imoview_hash: string | null };
    if (ex.imoview_hash !== hash) {
      await sb.from("clientes").update({ ...payload, imoview_hash: hash }).eq("id", ex.id);
    } else {
      await sb.from("clientes").update({ imoview_sync_at: payload.imoview_sync_at, ativo: true }).eq("id", ex.id);
    }
    return ex.id;
  }
  const { data: ins, error } = await sb.from("clientes").insert({ ...payload, imoview_hash: hash }).select("id").single();
  if (error) throw error;
  return (ins as { id: string }).id;
}

async function processImovel(sb: Sb, im: { id: string; codigo_imoview: number }, stats: Stats) {
  try {
    const { raws } = await fetchProprietariosFor(im.codigo_imoview);
    if (raws.length === 0) {
      stats.semProprietario++;
      return;
    }
    for (const raw of raws) {
      const clienteId = await upsertCliente(sb, raw);
      if (!clienteId) continue;
      const percentual = pickPercentual(raw);
      const { error: linkErr } = await sb.from("cliente_imoveis").upsert(
        { cliente_id: clienteId, imovel_id: im.id, papel: "proprietario", percentual },
        { onConflict: "cliente_id,imovel_id,papel" },
      );
      if (linkErr) throw linkErr;
      stats.vinculos++;
    }
    stats.comProprietario++;
  } catch (e) {
    stats.errors++;
    console.error(`[sync-prop] imovel ${im.codigo_imoview}: ${(e as Error).message}`);
  }
}

type Stats = { comProprietario: number; semProprietario: number; vinculos: number; errors: number; total: number };

async function persistStats(sb: Sb, syncId: string, stats: Stats, endpoint: string | null) {
  await sb.from("imoview_sync_log").update({
    inserted: stats.vinculos,
    updated: stats.comProprietario,
    unchanged: stats.semProprietario,
    errors_count: stats.errors,
    total: stats.total,
    error_details: endpoint ? { endpoint } : null,
    updated_at: new Date().toISOString(),
  }).eq("id", syncId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { mode = "full", sync_id, codigoImovel, internal_cursor, hours = 24, onlyMissing, limit, imovelIds } = body as {
      mode?: "full" | "incremental" | "single";
      sync_id?: string;
      codigoImovel?: number;
      internal_cursor?: { offset: number; ids: string[]; codigos: number[] };
      hours?: number;
      onlyMissing?: boolean;
      limit?: number;
      imovelIds?: string[];
    };

    // ===== single =====
    if (mode === "single") {
      if (!codigoImovel) return new Response(JSON.stringify({ error: "codigoImovel obrigatório" }), { status: 400, headers: corsHeaders });
      const { data: im } = await sb.from("imoveis_proprios").select("id, codigo_imoview").eq("codigo_imoview", codigoImovel).maybeSingle();
      if (!im) return new Response(JSON.stringify({ error: "imóvel não encontrado" }), { status: 404, headers: corsHeaders });
      const stats: Stats = { comProprietario: 0, semProprietario: 0, vinculos: 0, errors: 0, total: 1 };
      await processImovel(sb, im as { id: string; codigo_imoview: number }, stats);
      return new Response(JSON.stringify({ ok: true, stats, endpoint: resolvedEndpoint?.path ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let activeSyncId = sync_id;
    let cursor = internal_cursor;

    // ===== Primeira chamada =====
    if (!activeSyncId) {
      const auth = req.headers.get("Authorization") || "";
      let userId: string | null = null;
      if (auth.startsWith("Bearer ")) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
        const { data } = await userClient.auth.getUser();
        userId = data.user?.id ?? null;
      }

      // Lista imóveis-alvo
      let q = sb.from("imoveis_proprios").select("id, codigo_imoview").not("codigo_imoview", "is", null);
      if (mode === "incremental") {
        const since = new Date(Date.now() - hours * 3600_000).toISOString();
        q = q.gte("imoview_sync_at", since);
      }
      if (Array.isArray(imovelIds) && imovelIds.length > 0) {
        q = q.in("id", imovelIds);
      }
      const { data: targets, error: tErr } = await q;
      if (tErr) throw tErr;
      let filtered = (targets || []) as { id: string; codigo_imoview: number }[];

      if (onlyMissing) {
        const { data: existingLinks } = await sb
          .from("cliente_imoveis")
          .select("imovel_id")
          .eq("papel", "proprietario");
        const withProp = new Set(((existingLinks || []) as { imovel_id: string }[]).map((r) => r.imovel_id));
        filtered = filtered.filter((t) => !withProp.has(t.id));
      }
      if (typeof limit === "number" && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      const ids = filtered.map((t) => t.id);
      const codigos = filtered.map((t) => t.codigo_imoview);

      const { data: log, error } = await sb
        .from("imoview_sync_log")
        .insert({
          status: "running",
          mode: mode === "incremental" ? "proprietarios_incremental" : "proprietarios_full",
          triggered_by: userId,
          cursor: { offset: 0, ids, codigos },
          total: codigos.length,
        })
        .select("id")
        .single();
      if (error) throw error;
      activeSyncId = (log as { id: string }).id;
      cursor = { offset: 0, ids, codigos };

      const selfUrl = `${SUPABASE_URL}/functions/v1/imoview-sync-proprietarios`;
      (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(
        fetch(selfUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ mode, sync_id: activeSyncId, internal_cursor: cursor }),
        }).then((r) => r.text()).catch((e) => console.error("[sync-prop] self-invoke:", e)),
      );

      return new Response(JSON.stringify({ ok: true, sync_id: activeSyncId, status: "running", total: codigos.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Chunk =====
    if (!cursor) throw new Error("cursor ausente");
    const { offset, ids, codigos } = cursor;
    const slice = Math.min(BATCH_SIZE, ids.length - offset);
    const stats: Stats = { comProprietario: 0, semProprietario: 0, vinculos: 0, errors: 0, total: ids.length };

    // Carrega stats atuais para somar
    const { data: cur } = await sb.from("imoveis_proprios").select("id").limit(1); void cur;
    const { data: curLog } = await sb.from("imoview_sync_log").select("inserted, updated, unchanged, errors_count").eq("id", activeSyncId).single();
    const base = curLog as { inserted: number; updated: number; unchanged: number; errors_count: number };

    for (let i = 0; i < slice; i += CONCURRENCY) {
      const chunk: { id: string; codigo_imoview: number }[] = [];
      for (let j = 0; j < CONCURRENCY && (i + j) < slice; j++) {
        chunk.push({ id: ids[offset + i + j], codigo_imoview: codigos[offset + i + j] });
      }
      await Promise.all(chunk.map((im) => processImovel(sb, im, stats)));
      await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
    }

    const newOffset = offset + slice;
    const done = newOffset >= ids.length;

    await sb.from("imoview_sync_log").update({
      inserted: (base?.inserted || 0) + stats.vinculos,
      updated: (base?.updated || 0) + stats.comProprietario,
      unchanged: (base?.unchanged || 0) + stats.semProprietario,
      errors_count: (base?.errors_count || 0) + stats.errors,
      cursor: { offset: newOffset, ids, codigos },
      error_details: resolvedEndpoint ? { endpoint: resolvedEndpoint.path } : null,
      status: done ? (((base?.errors_count || 0) + stats.errors) > 0 ? "partial" : "ok") : "running",
      finished_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", activeSyncId);

    if (!done) {
      const selfUrl = `${SUPABASE_URL}/functions/v1/imoview-sync-proprietarios`;
      (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(
        fetch(selfUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ mode, sync_id: activeSyncId, internal_cursor: { offset: newOffset, ids, codigos } }),
        }).then((r) => r.text()).catch((e) => console.error("[sync-prop] self-invoke chunk:", e)),
      );
    }

    return new Response(JSON.stringify({ ok: true, sync_id: activeSyncId, done, processed: newOffset, total: ids.length, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[sync-prop] fatal:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
