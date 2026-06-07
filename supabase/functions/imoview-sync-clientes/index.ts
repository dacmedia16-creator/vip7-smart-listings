// Sincronização de clientes (pessoas + empresas) do Imoview → tabela `clientes` + `cliente_imoveis`.
// Fonte: endpoints App_ do Imoview, que exigem um login real de usuário do CRM.
// Modos: 'full' (varre Pessoas + Empresas), 'incremental' (mesmo fluxo do full — dedup por hash),
//        'single' (re-sincroniza um código).

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

const PAGE_SIZE = 50;
const PAGES_PER_CHUNK = 4;
// Etapas: 0 = pessoas físicas, 1 = empresas
const ETAPAS = ["pessoas", "empresas"] as const;

type Sb = ReturnType<typeof createClient>;
type Etapa = typeof ETAPAS[number];
type Session = { codigoacesso: string; codigousuario: number };

// ---------- login App_ ----------
let cachedSession: Session | null = null;

async function loginApp(): Promise<Session> {
  if (cachedSession) return cachedSession;
  if (!IMOVIEW_APP_EMAIL || !IMOVIEW_APP_SENHA) {
    throw new Error("IMOVIEW_APP_EMAIL/IMOVIEW_APP_SENHA não configurados (secrets).");
  }
  const url = new URL(`${IMOVIEW_API_URL}/Usuario/App_ValidarAcesso`);
  url.searchParams.set("email", IMOVIEW_APP_EMAIL);
  url.searchParams.set("senha", IMOVIEW_APP_SENHA);
  const res = await fetch(url.toString(), { method: "GET", headers: { chave: IMOVIEW_API_KEY } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`App_ValidarAcesso ${res.status}: ${txt.slice(0, 300)}`);
  let data: Record<string, unknown>;
  try { data = JSON.parse(txt); } catch { throw new Error(`App_ValidarAcesso resposta inválida: ${txt.slice(0, 200)}`); }
  const codigoacesso = String(data.codigoacesso ?? "");
  const codigousuario = Number(data.codigousuario ?? 0);
  if (!codigoacesso || !codigousuario) {
    throw new Error(`Login Imoview falhou. Resposta: ${txt.slice(0, 300)}`);
  }
  cachedSession = { codigoacesso, codigousuario };
  console.log(`[sync-clientes] login OK codigousuario=${codigousuario}`);
  return cachedSession;
}

async function imoviewApp(path: string, params: Record<string, string | number>): Promise<unknown> {
  const session = await loginApp();
  const url = new URL(`${IMOVIEW_API_URL}${path}`);
  url.searchParams.set("codigoUsuario", String(session.codigousuario));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  let res = await fetch(url.toString(), {
    method: "GET",
    headers: { chave: IMOVIEW_API_KEY, codigoacesso: session.codigoacesso },
  });
  // Token expirado? Re-login uma vez.
  if (res.status === 401 || res.status === 403) {
    cachedSession = null;
    const s2 = await loginApp();
    url.searchParams.set("codigoUsuario", String(s2.codigousuario));
    res = await fetch(url.toString(), {
      method: "GET",
      headers: { chave: IMOVIEW_API_KEY, codigoacesso: s2.codigoacesso },
    });
  }
  const txt = await res.text();
  if (!res.ok) throw new Error(`Imoview ${path} ${res.status}: ${txt.slice(0, 300)}`);
  try { return JSON.parse(txt); } catch { return null; }
}

// ---------- helpers ----------
async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function asList(d: unknown): Record<string, unknown>[] {
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === "object") {
    const r = d as Record<string, unknown>;
    for (const k of ["lista", "pessoas", "empresas", "clientes", "dados", "resultado", "items"]) {
      if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function unwrap(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== "object") return null;
  const r = d as Record<string, unknown>;
  for (const k of ["pessoa", "empresa", "cliente", "dados", "resultado"]) {
    if (r[k] && typeof r[k] === "object" && !Array.isArray(r[k])) return r[k] as Record<string, unknown>;
  }
  return r;
}

function pickCodigo(it: Record<string, unknown>): number {
  const v = it.codigo ?? it.codigocliente ?? it.codigoCliente
    ?? it.codigopessoa ?? it.codigoPessoa
    ?? it.codigoempresa ?? it.codigoEmpresa ?? it.id;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ---------- API calls ----------
async function fetchListing(etapa: Etapa, pagina: number): Promise<Record<string, unknown>[]> {
  const path = etapa === "pessoas" ? "/Cliente/App_RetornarPessoas" : "/Cliente/App_RetornarEmpresas";
  try {
    const d = await imoviewApp(path, { numeroPagina: pagina, numeroRegistros: PAGE_SIZE });
    return asList(d);
  } catch (e) {
    console.warn(`[sync-clientes] ${path} pag=${pagina}: ${(e as Error).message}`);
    return [];
  }
}

async function fetchDetails(codigo: number): Promise<Record<string, unknown> | null> {
  try {
    const d = await imoviewApp("/Cliente/App_RetornarDetalhesCliente", { codigoCliente: codigo });
    const u = unwrap(d);
    if (u && !u.codigo) u.codigo = codigo;
    return u;
  } catch (e) {
    console.warn(`[sync-clientes] detalhes ${codigo}: ${(e as Error).message}`);
    return null;
  }
}

// ---------- mapeamento ----------
function deriveCategorias(raw: Record<string, unknown>, etapa?: Etapa): string[] {
  const cats = new Set<string>();
  const tipo = String(raw.tipo ?? raw.categoria ?? raw.tipopessoa ?? raw.tiporelacionamento ?? raw.tipoRelacionamento ?? "").toLowerCase();
  if (tipo.includes("propriet")) cats.add("proprietario");
  if (tipo.includes("comprador") || tipo.includes("cliente")) cats.add("comprador");
  if (tipo.includes("locat") || tipo.includes("inquil")) cats.add("locatario");
  if (tipo.includes("interess")) cats.add("interessado");
  if (Array.isArray(raw.categorias)) {
    for (const c of raw.categorias as unknown[]) {
      const s = String(c).toLowerCase();
      if (s.includes("propriet")) cats.add("proprietario");
      if (s.includes("comprador")) cats.add("comprador");
      if (s.includes("locat") || s.includes("inquil")) cats.add("locatario");
      if (s.includes("interess")) cats.add("interessado");
    }
  }
  if (Array.isArray(raw.imoveis) && (raw.imoveis as unknown[]).length > 0) cats.add("proprietario");
  if (etapa === "empresas") cats.add("empresa");
  if (cats.size === 0) cats.add("contato");
  return Array.from(cats);
}

type Vinculo = { codigo_imoview: number; papel: "proprietario" | "comprador" | "locatario" | "interessado"; percentual?: number };

function extractVinculos(raw: Record<string, unknown>): Vinculo[] {
  const out: Vinculo[] = [];
  const push = (codigo: unknown, papel: Vinculo["papel"], percentual?: unknown) => {
    const n = Number(codigo);
    if (!Number.isFinite(n) || n <= 0) return;
    const p = percentual != null ? Number(percentual) : undefined;
    out.push({ codigo_imoview: n, papel, percentual: Number.isFinite(p ?? NaN) ? p : undefined });
  };
  const tryArr = (arr: unknown, papel: Vinculo["papel"]) => {
    if (!Array.isArray(arr)) return;
    for (const it of arr as Record<string, unknown>[]) {
      const codigo = it.codigo ?? it.codigoimovel ?? it.codigoImovel ?? it.id;
      push(codigo, papel, it.percentual ?? it.percentualparticipacao);
    }
  };
  tryArr(raw.imoveis, "proprietario");
  tryArr(raw.imoveisproprietario, "proprietario");
  tryArr(raw.imoveisProprietario, "proprietario");
  tryArr(raw.imoveiscomprador, "comprador");
  tryArr(raw.imoveisComprador, "comprador");
  tryArr(raw.imoveislocatario, "locatario");
  tryArr(raw.imoveisLocatario, "locatario");
  tryArr(raw.imoveisinteresse, "interessado");
  tryArr(raw.imoveisInteresse, "interessado");
  tryArr(raw.interesses, "interessado");
  return out;
}

function mapRow(raw: Record<string, unknown>, etapa?: Etapa) {
  const codigo = pickCodigo(raw);
  const cpf = String(raw.cpf ?? raw.cnpj ?? raw.cpfcnpj ?? raw.cpfCnpj ?? "").trim() || null;
  const isEmpresa = etapa === "empresas" || (cpf && cpf.replace(/\D/g, "").length > 11) || raw.razaosocial || raw.razaoSocial;
  const tipoPessoa = isEmpresa ? "juridica" : "fisica";
  const nome = String(
    raw.nome ?? raw.nomecompleto ?? raw.nomeCompleto ?? raw.razaosocial ?? raw.razaoSocial ?? raw.nomefantasia ?? raw.nomeFantasia ?? "",
  ).trim() || `Cliente ${codigo}`;
  return {
    codigo,
    payload: {
      codigo_imoview: codigo,
      origem: "imoview",
      nome,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpf,
      rg: (raw.rg as string) || null,
      email: (raw.email as string) || null,
      telefone: String(raw.telefone ?? raw.celular ?? raw.fone ?? raw.telefoneCelular ?? "").trim() || null,
      telefone_secundario: (raw.telefone2 as string) || (raw.celular as string) || (raw.telefoneComercial as string) || null,
      data_nascimento: ((): string | null => {
        const v = raw.datanascimento ?? raw.dataNascimento;
        if (!v || typeof v !== "string") return null;
        const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
      })(),
      endereco: (raw.endereco as string) || null,
      numero: (raw.numero as string) || null,
      complemento: (raw.complemento as string) || null,
      bairro: (raw.bairro as string) || null,
      cidade: (raw.cidade as string) || null,
      estado: (raw.estado as string) || null,
      cep: (raw.cep as string) || null,
      observacoes: (raw.observacoes as string) || null,
      categorias: deriveCategorias(raw, etapa),
      ativo: true,
      imoview_raw: raw,
    },
  };
}

async function syncVinculos(sb: Sb, clienteId: string, vinculos: Vinculo[]) {
  if (vinculos.length === 0) return;
  const codigos = Array.from(new Set(vinculos.map((v) => v.codigo_imoview)));
  const { data: imoveis } = await sb
    .from("imoveis_proprios")
    .select("id, codigo_imoview")
    .in("codigo_imoview", codigos);
  const map = new Map<number, string>();
  for (const im of (imoveis || []) as { id: string; codigo_imoview: number }[]) map.set(im.codigo_imoview, im.id);

  for (const v of vinculos) {
    const imovelId = map.get(v.codigo_imoview);
    if (!imovelId) continue;
    await sb.from("cliente_imoveis").upsert(
      { cliente_id: clienteId, imovel_id: imovelId, papel: v.papel, percentual: v.percentual ?? null },
      { onConflict: "cliente_id,imovel_id,papel" },
    );
  }
}

async function persistStats(sb: Sb, syncId: string, delta: { inserted?: number; updated?: number; unchanged?: number; errors?: number; total?: number }) {
  try {
    const { data: cur } = await sb.from("imoview_sync_log").select("inserted, updated, unchanged, errors_count, total").eq("id", syncId).single();
    await sb.from("imoview_sync_log").update({
      inserted: (cur?.inserted || 0) + (delta.inserted || 0),
      updated: (cur?.updated || 0) + (delta.updated || 0),
      unchanged: (cur?.unchanged || 0) + (delta.unchanged || 0),
      errors_count: (cur?.errors_count || 0) + (delta.errors || 0),
      total: (cur?.total || 0) + (delta.total || 0),
      updated_at: new Date().toISOString(),
    }).eq("id", syncId);
  } catch (e) {
    console.error("[sync-clientes] persistStats:", e);
  }
}

async function syncOne(sb: Sb, raw: Record<string, unknown>, etapa: Etapa | undefined, stats: { inserted: number; updated: number; unchanged: number; errors: number }, syncId: string | null) {
  try {
    const m = mapRow(raw, etapa);
    if (!m.codigo) return;
    const hash = await sha256Hex(JSON.stringify(m.payload));

    const { data: existing } = await sb
      .from("clientes")
      .select("id, imoview_hash")
      .eq("codigo_imoview", m.codigo)
      .maybeSingle();

    let clienteId: string;
    const row = { ...m.payload, imoview_hash: hash, imoview_sync_at: new Date().toISOString() };

    if (existing) {
      clienteId = (existing as { id: string }).id;
      if ((existing as { imoview_hash: string | null }).imoview_hash === hash) {
        stats.unchanged++;
        if (syncId) await persistStats(sb, syncId, { unchanged: 1 });
        await sb.from("clientes").update({ imoview_sync_at: row.imoview_sync_at, ativo: true }).eq("id", clienteId);
      } else {
        await sb.from("clientes").update(row).eq("id", clienteId);
        stats.updated++;
        if (syncId) await persistStats(sb, syncId, { updated: 1 });
      }
    } else {
      const { data: ins, error } = await sb.from("clientes").insert(row).select("id").single();
      if (error) throw error;
      clienteId = (ins as { id: string }).id;
      stats.inserted++;
      if (syncId) await persistStats(sb, syncId, { inserted: 1 });
    }

    await syncVinculos(sb, clienteId, extractVinculos(raw));
  } catch (e) {
    stats.errors++;
    console.error("[sync-clientes] erro:", e);
    if (syncId) await persistStats(sb, syncId, { errors: 1 });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { mode = "full", sync_id, codigo, internal_cursor } = body as {
      mode?: "full" | "incremental" | "single";
      sync_id?: string;
      codigo?: number;
      internal_cursor?: { etapaIdx: number; pagina: number };
    };

    // ===== modo single =====
    if (mode === "single") {
      if (!codigo) return new Response(JSON.stringify({ error: "codigo obrigatório" }), { status: 400, headers: corsHeaders });
      const detail = await fetchDetails(codigo);
      if (!detail) return new Response(JSON.stringify({ error: "não encontrado" }), { status: 404, headers: corsHeaders });
      const stats = { inserted: 0, updated: 0, unchanged: 0, errors: 0 };
      await syncOne(sb, detail, undefined, stats, null);
      return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let activeSyncId = sync_id;
    let cursor = internal_cursor;

    // ===== Primeira chamada: cria log + auto-invoca =====
    if (!activeSyncId) {
      const auth = req.headers.get("Authorization") || "";
      let userId: string | null = null;
      if (auth.startsWith("Bearer ")) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
        const { data } = await userClient.auth.getUser();
        userId = data.user?.id ?? null;
      }

      const logMode = mode === "incremental" ? "clientes_incremental" : "clientes_full";
      const initialCursor = { etapaIdx: 0, pagina: 1 };

      const { data: log, error } = await sb
        .from("imoview_sync_log")
        .insert({ status: "running", mode: logMode, triggered_by: userId, cursor: initialCursor })
        .select("id")
        .single();
      if (error) throw error;
      activeSyncId = (log as { id: string }).id;
      cursor = initialCursor;

      const selfUrl = `${SUPABASE_URL}/functions/v1/imoview-sync-clientes`;
      (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(
        fetch(selfUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ mode, sync_id: activeSyncId, internal_cursor: cursor }),
        }).then((r) => r.text()).catch((e) => console.error("[sync-clientes] self-invoke:", e)),
      );
      return new Response(JSON.stringify({ ok: true, sync_id: activeSyncId, status: "running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Chunk =====
    const stats = { inserted: 0, updated: 0, unchanged: 0, errors: 0 };
    let { etapaIdx = 0, pagina = 1 } = cursor || {};
    let pagesProcessed = 0;
    let done = false;

    while (pagesProcessed < PAGES_PER_CHUNK && etapaIdx < ETAPAS.length) {
      const etapa = ETAPAS[etapaIdx];
      const lista = await fetchListing(etapa, pagina);
      console.log(`[sync-clientes] etapa=${etapa} pag=${pagina} -> ${lista.length}`);

      if (lista.length === 0) {
        etapaIdx++;
        pagina = 1;
        await sb.from("imoview_sync_log").update({ cursor: { etapaIdx, pagina }, updated_at: new Date().toISOString() }).eq("id", activeSyncId);
        continue;
      }

      // Log shape do primeiro item para ajudar debug
      if (pagina === 1) {
        console.log(`[sync-clientes] keys ${etapa}:`, Object.keys(lista[0]).sort().join(","));
      }

      const codigos = lista.map(pickCodigo).filter((n) => n > 0);
      const conc = 3;
      for (let i = 0; i < codigos.length; i += conc) {
        const slice = codigos.slice(i, i + conc);
        const details = await Promise.all(slice.map((c) => fetchDetails(c)));
        for (let j = 0; j < details.length; j++) {
          const d = details[j] || lista[i + j];
          if (d) await syncOne(sb, d, etapa, stats, activeSyncId!);
        }
      }

      pagesProcessed++;
      await persistStats(sb, activeSyncId, { total: lista.length });

      if (lista.length < PAGE_SIZE) {
        etapaIdx++;
        pagina = 1;
      } else {
        pagina++;
      }

      await sb.from("imoview_sync_log").update({ cursor: { etapaIdx, pagina }, updated_at: new Date().toISOString() }).eq("id", activeSyncId);
    }

    if (etapaIdx >= ETAPAS.length) done = true;

    const update: Record<string, unknown> = { cursor: { etapaIdx, pagina }, updated_at: new Date().toISOString() };
    if (done) {
      const { data: log } = await sb.from("imoview_sync_log").select("errors_count").eq("id", activeSyncId).single();
      update.status = ((log as { errors_count?: number })?.errors_count || 0) > 0 ? "partial" : "ok";
      update.finished_at = new Date().toISOString();
    }
    await sb.from("imoview_sync_log").update(update).eq("id", activeSyncId);

    if (!done) {
      const selfUrl = `${SUPABASE_URL}/functions/v1/imoview-sync-clientes`;
      (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(
        fetch(selfUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ mode, sync_id: activeSyncId, internal_cursor: { etapaIdx, pagina } }),
        }).then((r) => r.text()).catch((e) => console.error("[sync-clientes] self-invoke chunk:", e)),
      );
    }

    return new Response(JSON.stringify({ ok: true, sync_id: activeSyncId, done, stats, cursor: { etapaIdx, pagina } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[sync-clientes] fatal:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
