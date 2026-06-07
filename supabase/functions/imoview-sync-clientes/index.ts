// Sincronização de clientes (pessoas) Imoview → tabela `clientes` + vínculos `cliente_imoveis`.
// Modos: 'full' (varre tudo), 'incremental' (últimos 7 dias), 'single' (um código).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IMOVIEW_API_KEY = Deno.env.get("IMOVIEW_API_KEY")!;
const IMOVIEW_API_URL = "https://api.imoview.com.br";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGE_SIZE = 20;
const PAGES_PER_CHUNK = 5;

type Sb = ReturnType<typeof createClient>;

async function imoviewFetch(path: string, body?: unknown, method = "POST"): Promise<unknown> {
  const res = await fetch(`${IMOVIEW_API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", chave: IMOVIEW_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Imoview ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function asList(d: unknown): Record<string, unknown>[] {
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === "object") {
    const r = d as Record<string, unknown>;
    if (Array.isArray(r.lista)) return r.lista as Record<string, unknown>[];
    if (Array.isArray(r.pessoas)) return r.pessoas as Record<string, unknown>[];
    if (Array.isArray(r.dados)) return r.dados as Record<string, unknown>[];
    if (Array.isArray(r.resultado)) return r.resultado as Record<string, unknown>[];
  }
  return [];
}

function unwrap(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== "object") return null;
  const r = d as Record<string, unknown>;
  if (r.pessoa && typeof r.pessoa === "object") return r.pessoa as Record<string, unknown>;
  if (r.dados && typeof r.dados === "object") return r.dados as Record<string, unknown>;
  if (r.resultado && typeof r.resultado === "object") return r.resultado as Record<string, unknown>;
  return r;
}

async function fetchListing(pagina: number): Promise<Record<string, unknown>[]> {
  // Tenta endpoints em ordem (a API Imoview varia por conta).
  const attempts: [string, unknown, string][] = [
    ["/Pessoa/RetornarPessoas", { numeropagina: pagina, numeroregistros: PAGE_SIZE }, "POST"],
    ["/Cliente/RetornarClientes", { numeropagina: pagina, numeroregistros: PAGE_SIZE }, "POST"],
    ["/Proprietario/RetornarProprietarios", { numeropagina: pagina, numeroregistros: PAGE_SIZE }, "POST"],
  ];
  for (const [path, body, method] of attempts) {
    try {
      const data = await imoviewFetch(path, body, method);
      const list = asList(data);
      if (list.length > 0 || pagina > 1) return list;
    } catch (e) {
      if (pagina === 1) console.warn(`[sync-clientes] ${path}:`, (e as Error).message);
    }
  }
  return [];
}

// Lista somente pessoas alteradas desde uma data (incremental).
// Formato da data esperado pelo Imoview: dd/MM/yyyy.
function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

async function fetchListingIncremental(pagina: number, dataInicial: string): Promise<Record<string, unknown>[]> {
  const attempts: [string, unknown, string][] = [
    ["/Pessoa/RetornarPessoasAlteradas", { datainicial: dataInicial, numeropagina: pagina, numeroregistros: PAGE_SIZE }, "POST"],
    ["/Cliente/RetornarClientesAlterados", { datainicial: dataInicial, numeropagina: pagina, numeroregistros: PAGE_SIZE }, "POST"],
    ["/Proprietario/RetornarProprietariosAlterados", { datainicial: dataInicial, numeropagina: pagina, numeroregistros: PAGE_SIZE }, "POST"],
  ];
  for (const [path, body, method] of attempts) {
    try {
      const data = await imoviewFetch(path, body, method);
      const list = asList(data);
      if (list.length > 0 || pagina > 1) return list;
    } catch (e) {
      if (pagina === 1) console.warn(`[sync-clientes] incremental ${path}:`, (e as Error).message);
    }
  }
  return [];
}



async function fetchDetails(codigo: number): Promise<Record<string, unknown> | null> {
  for (const path of [
    `/Pessoa/RetornarDetalhesPessoa?codigo=${codigo}`,
    `/Pessoa/RetornarPessoa?codigo=${codigo}`,
    `/Cliente/RetornarDetalhesCliente?codigo=${codigo}`,
    `/Proprietario/RetornarDetalhesProprietario?codigo=${codigo}`,
  ]) {
    try {
      const d = await imoviewFetch(path, undefined, "GET");
      const u = unwrap(d);
      if (u) {
        if (!u.codigo) u.codigo = codigo;
        return u;
      }
    } catch (_e) { /* try next */ }
  }
  return null;
}

function pickCodigo(it: Record<string, unknown>): number {
  const v = it.codigo ?? it.codigopessoa ?? it.codigoPessoa ?? it.id;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function deriveCategorias(raw: Record<string, unknown>): string[] {
  const cats = new Set<string>();
  const tipo = String(raw.tipo ?? raw.categoria ?? raw.tipopessoa ?? "").toLowerCase();
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
  // Heurística baseada nos vínculos
  const imoveis = (raw.imoveis ?? raw.imoveisproprietario) as unknown;
  if (Array.isArray(imoveis) && imoveis.length > 0) cats.add("proprietario");
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

function mapRow(raw: Record<string, unknown>) {
  const codigo = pickCodigo(raw);
  const cpf = String(raw.cpf ?? raw.cnpj ?? raw.cpfcnpj ?? "").trim() || null;
  const tipoPessoa = cpf && cpf.replace(/\D/g, "").length > 11 ? "juridica" : "fisica";
  return {
    codigo,
    payload: {
      codigo_imoview: codigo,
      origem: "imoview",
      nome: String(raw.nome ?? raw.razaosocial ?? "").trim() || `Pessoa ${codigo}`,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: cpf,
      rg: (raw.rg as string) || null,
      email: (raw.email as string) || null,
      telefone: String(raw.telefone ?? raw.celular ?? raw.fone ?? "").trim() || null,
      telefone_secundario: (raw.telefone2 as string) || (raw.celular as string) || null,
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
      categorias: deriveCategorias(raw),
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

async function syncOne(sb: Sb, raw: Record<string, unknown>, stats: { inserted: number; updated: number; unchanged: number; errors: number }, syncId: string | null) {
  try {
    const m = mapRow(raw);
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
      } else {
        await sb.from("clientes").update(row).eq("id", clienteId);
        stats.updated++;
      }
    } else {
      const { data: ins, error } = await sb.from("clientes").insert(row).select("id").single();
      if (error) throw error;
      clienteId = (ins as { id: string }).id;
      stats.inserted++;
    }

    await syncVinculos(sb, clienteId, extractVinculos(raw));

    if (syncId) await persistStats(sb, syncId, { inserted: existing ? 0 : 1, updated: existing && stats ? 0 : 0 });
  } catch (e) {
    stats.errors++;
    console.error("[sync-clientes] erro:", e);
    if (syncId) await persistStats(sb, syncId, { errors: 1 });
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { mode = "full", sync_id, codigo, internal_cursor } = body as {
      mode?: "full" | "incremental" | "single";
      sync_id?: string;
      codigo?: number;
      internal_cursor?: { pagina: number };
    };

    if (mode === "single") {
      if (!codigo) return new Response(JSON.stringify({ error: "codigo obrigatório" }), { status: 400, headers: corsHeaders });
      const detail = await fetchDetails(codigo);
      if (!detail) return new Response(JSON.stringify({ error: "não encontrado" }), { status: 404, headers: corsHeaders });
      const stats = { inserted: 0, updated: 0, unchanged: 0, errors: 0 };
      await syncOne(sb, detail, stats, null);
      return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let activeSyncId = sync_id;
    let cursor = internal_cursor;

    if (!activeSyncId) {
      const auth = req.headers.get("Authorization") || "";
      let userId: string | null = null;
      if (auth.startsWith("Bearer ")) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
        const { data } = await userClient.auth.getUser();
        userId = data.user?.id ?? null;
      }

      const logMode = mode === "incremental" ? "clientes_incremental" : "clientes_full";
      const { data: log, error } = await sb
        .from("imoview_sync_log")
        .insert({ status: "running", mode: logMode, triggered_by: userId, cursor: { pagina: 1 } })
        .select("id")
        .single();
      if (error) throw error;
      activeSyncId = (log as { id: string }).id;
      cursor = { pagina: 1 };

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

    const stats = { inserted: 0, updated: 0, unchanged: 0, errors: 0 };
    let { pagina = 1 } = cursor || {};
    let pagesProcessed = 0;
    let done = false;

    while (pagesProcessed < PAGES_PER_CHUNK) {
      const lista = await fetchListing(pagina);
      console.log(`[sync-clientes] pag=${pagina} -> ${lista.length}`);

      if (lista.length === 0) { done = true; break; }

      const codigos = lista.map(pickCodigo).filter((n) => n > 0);
      const conc = 3;
      for (let i = 0; i < codigos.length; i += conc) {
        const slice = codigos.slice(i, i + conc);
        const details = await Promise.all(slice.map((c) => fetchDetails(c)));
        for (let j = 0; j < details.length; j++) {
          const d = details[j] || lista[i + j];
          if (d) await syncOne(sb, d, stats, activeSyncId!);
        }
      }

      pagesProcessed++;
      await persistStats(sb, activeSyncId, { total: lista.length });
      if (lista.length < PAGE_SIZE) { done = true; break; }
      pagina++;
    }

    const update: Record<string, unknown> = { cursor: { pagina }, updated_at: new Date().toISOString() };
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
          body: JSON.stringify({ mode, sync_id: activeSyncId, internal_cursor: { pagina } }),
        }).then((r) => r.text()).catch((e) => console.error("[sync-clientes] self-invoke chunk:", e)),
      );
    }

    return new Response(JSON.stringify({ ok: true, sync_id: activeSyncId, done, stats, cursor: { pagina } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[sync-clientes] fatal:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
