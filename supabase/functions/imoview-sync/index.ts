// Sincronização do catálogo Imoview para o banco local (imoveis_proprios).
// Modos:
//  - mode: 'full'        -> varre todas as páginas de Venda e Aluguel (com cursor + auto-reinvoke)
//  - mode: 'incremental' -> usa RetornarImoveisAlterados (últimos N dias)
//  - mode: 'single'      -> re-sincroniza um único código

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

const PAGE_SIZE = 20; // limite máximo da API listagem
const PAGES_PER_CHUNK = 4; // páginas por invocação para não estourar timeout
const FINALIDADES = [2, 1]; // 2 = Venda, 1 = Aluguel

// ---------- helpers de parsing (espelham imoview-api) ----------
const parseCurrencyValue = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/R\$\s*/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};
const parseNum = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(",", ".")) || 0;
  return 0;
};
const parseInt2 = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseInt(v) || 0;
  return 0;
};
const parseDate = (val: unknown): string | null => {
  if (!val || typeof val !== "string") return null;
  const t = val.trim();
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (m) {
    const [, d, mo, y, h = "00", mi = "00", s = "00"] = m;
    return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
  }
  return t;
};
const normFinalidade = (raw: unknown): "venda" | "aluguel" => {
  if (typeof raw === "string") return raw.toLowerCase().includes("aluguel") ? "aluguel" : "venda";
  if (typeof raw === "number") return raw === 1 ? "aluguel" : "venda";
  return "venda";
};

// Mapeia situação/statusimovel do Imoview para o enum local imovel_status
const mapStatus = (raw: Record<string, unknown>): "disponivel" | "sob_proposta" | "vendido" | "alugado" | "inativo" => {
  const s = String(raw.situacao ?? raw.statusimovel ?? raw.status ?? "").toLowerCase().trim();
  if (!s) return "disponivel";
  if (s.includes("vend")) return "vendido";
  if (s.includes("alug") || s.includes("loca")) return "alugado";
  if (s.includes("propost") || s.includes("reserv")) return "sob_proposta";
  if (s.includes("inativ") || s.includes("suspens") || s.includes("bloque") || s.includes("desativ") || s.includes("indispon")) return "inativo";
  return "disponivel";
};

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function slug(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

// ---------- Imoview API ----------
async function imoviewFetch(path: string, body?: unknown, method = "POST"): Promise<unknown> {
  const res = await fetch(`${IMOVIEW_API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", chave: IMOVIEW_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Imoview ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchListing(finalidade: number, pagina: number): Promise<Record<string, unknown>[]> {
  // Tenta o endpoint geral (todos os status); se a conta não tiver acesso, cai para "Disponiveis".
  try {
    const data = await imoviewFetch("/Imovel/RetornarImoveis", {
      finalidade, numeropagina: pagina, numeroregistros: PAGE_SIZE,
    });
    return Array.isArray(data) ? data : ((data as Record<string, unknown>)?.lista as Record<string, unknown>[]) || [];
  } catch (e) {
    if (pagina === 1) console.warn(`[sync] RetornarImoveis indisponível, usando RetornarImoveisDisponiveis. Motivo:`, (e as Error).message);
    const data = await imoviewFetch("/Imovel/RetornarImoveisDisponiveis", {
      finalidade, numeropagina: pagina, numeroregistros: PAGE_SIZE,
    });
    return Array.isArray(data) ? data : ((data as Record<string, unknown>)?.lista as Record<string, unknown>[]) || [];
  }
}

const toArr = (data: unknown): Record<string, unknown>[] =>
  Array.isArray(data) ? data as Record<string, unknown>[]
  : ((data as Record<string, unknown>)?.lista as Record<string, unknown>[]) || [];

const isInativoRaw = (r: Record<string, unknown>): boolean => {
  const s = String(r.situacao ?? r.statusimovel ?? r.status ?? "").toLowerCase();
  return !!s && (s.includes("inativ") || s.includes("suspens") || s.includes("bloque") || s.includes("desativ") || s.includes("indispon"));
};

async function fetchListingDesativados(finalidade: number, pagina: number): Promise<Record<string, unknown>[]> {
  // Tentativa 1: endpoint dedicado de inativos
  try {
    const data = await imoviewFetch("/Imovel/RetornarImoveisInativos", {
      finalidade, numeropagina: pagina, numeroregistros: PAGE_SIZE,
    });
    const arr = toArr(data);
    if (pagina === 1) console.log(`[sync-desat] RetornarImoveisInativos fin=${finalidade} -> ${arr.length} itens`);
    return arr;
  } catch (e1) {
    if (pagina === 1) console.warn(`[sync-desat] RetornarImoveisInativos falhou:`, (e1 as Error).message);
  }
  // Tentativa 2: RetornarImoveis com filtro situacao=Inativo
  try {
    const data = await imoviewFetch("/Imovel/RetornarImoveis", {
      finalidade, situacao: "Inativo", numeropagina: pagina, numeroregistros: PAGE_SIZE,
    });
    const arr = toArr(data);
    if (pagina === 1) console.log(`[sync-desat] RetornarImoveis situacao=Inativo fin=${finalidade} -> ${arr.length} itens`);
    if (arr.length > 0) return arr;
  } catch (e2) {
    if (pagina === 1) console.warn(`[sync-desat] RetornarImoveis(situacao) falhou:`, (e2 as Error).message);
  }
  // Tentativa 3: varre RetornarImoveis e filtra inativos no servidor
  const data = await imoviewFetch("/Imovel/RetornarImoveis", {
    finalidade, numeropagina: pagina, numeroregistros: PAGE_SIZE,
  });
  const arr = toArr(data).filter(isInativoRaw);
  if (pagina === 1) console.log(`[sync-desat] fallback varredura fin=${finalidade} -> ${arr.length} inativos no chunk`);
  return arr;
}

function unwrapDetail(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== "object") return null;
  const r = d as Record<string, unknown>;
  if (r.imovel && typeof r.imovel === "object") return r.imovel as Record<string, unknown>;
  if (r.dados && typeof r.dados === "object") return r.dados as Record<string, unknown>;
  if (r.resultado && typeof r.resultado === "object") return r.resultado as Record<string, unknown>;
  const keys = Object.keys(r);
  if (keys.length === 1 && r[keys[0]] && typeof r[keys[0]] === "object") {
    return r[keys[0]] as Record<string, unknown>;
  }
  return r;
}

async function fetchDetails(codigo: number): Promise<Record<string, unknown> | null> {
  // Endpoint geral primeiro (cobre vendido/alugado/inativo); fallback ao de "Disponivel".
  for (const path of [
    `/Imovel/RetornarDetalhesImovel?codigoimovel=${codigo}`,
    `/Imovel/RetornarDetalhesImovelDisponivel?codigoimovel=${codigo}`,
  ]) {
    try {
      const d = await imoviewFetch(path, undefined, "GET");
      const unwrapped = unwrapDetail(d);
      if (unwrapped && !unwrapped.codigo) unwrapped.codigo = codigo;
      if (unwrapped) return unwrapped;
    } catch (e) {
      console.warn(`[sync] ${path} falhou:`, (e as Error).message);
    }
  }
  return null;
}

// ---------- mapeamento ----------
type Mapped = {
  codigo: number;
  payload: Record<string, unknown>;
  fotosUrls: string[];
};

function pickCodigo(it: Record<string, unknown>): number {
  const v = it.codigo ?? it.codigoimovel ?? (it as Record<string, unknown>).codigoImovel
    ?? (it as Record<string, unknown>).codigoImovelDisponivel ?? it.id;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function mapToRow(raw: Record<string, unknown>): Mapped {
  const codigo = pickCodigo(raw);
  const fin = normFinalidade(raw.finalidade);
  const valor = parseCurrencyValue(raw.valor);
  const condominio = parseCurrencyValue(raw.valorcondominio);
  const iptu = parseCurrencyValue(raw.valoriptu);

  const fotosArr: string[] = [];
  const principal = typeof raw.urlfotoprincipal === "string" ? raw.urlfotoprincipal : null;
  if (principal) fotosArr.push(principal);
  if (Array.isArray(raw.fotos)) {
    for (const f of raw.fotos as Record<string, unknown>[]) {
      const u = String(f.url || f.arquivo || "").trim();
      if (u && !fotosArr.includes(u)) fotosArr.push(u);
    }
  }

  const caracteristicas: string[] = [];
  if (Array.isArray(raw.caracteristicas)) {
    for (const c of raw.caracteristicas as unknown[]) {
      if (typeof c === "string") caracteristicas.push(c);
      else if (c && typeof c === "object") {
        const cc = c as Record<string, unknown>;
        const name = (cc.descricao || cc.nome || cc.titulo) as string | undefined;
        if (name) caracteristicas.push(String(name));
      }
    }
  }

  const titulo = (raw.titulo as string) || `${raw.tipo || "Imóvel"} em ${raw.bairro || raw.cidade || ""}`.trim();

  return {
    codigo,
    fotosUrls: fotosArr,
    payload: {
      codigo_imoview: codigo,
      origem: "imoview",
      titulo,
      descricao: (raw.descricao as string) || (raw.metadescription as string) || null,
      tipo: (raw.tipo as string) || "Imóvel",
      finalidade: fin,
      preco: valor || 0,
      condominio: condominio || null,
      iptu: iptu || null,
      area: parseNum(raw.areaprincipal || raw.areainterna) || null,
      area_total: parseNum(raw.arealote || raw.areaprincipal) || null,
      quartos: parseInt2(raw.numeroquartos) || null,
      suites: parseInt2(raw.numerosuites) || null,
      banheiros: parseInt2(raw.numerobanhos) || null,
      vagas: parseInt2(raw.numerovagas) || null,
      cep: (raw.cep as string) || null,
      endereco: (raw.endereco as string) || null,
      bairro: (raw.bairro as string) || null,
      cidade: (raw.cidade as string) || null,
      estado: (raw.estado as string) || "SP",
      latitude: parseNum(raw.latitude) || null,
      longitude: parseNum(raw.longitude) || null,
      condominio_nome: (raw.nomecondominio as string) || null,
      codigo_condominio_imoview: parseInt2(raw.codigocondominio) || null,
      aceita_permuta: raw.permuta === true || raw.permuta === 1 || raw.permuta === "1" || raw.permuta === "Sim",
      valor_m2: parseCurrencyValue(raw.valorm2) || null,
      destaque: raw.destaque === "Destaque" || raw.destaque === 1 || raw.destaque === "1",
      video_url: typeof raw.urlvideo === "string" && raw.urlvideo.trim() ? raw.urlvideo.trim() : null,
      caracteristicas,
      ativo: true,
      status: mapStatus(raw),
      data_atualizacao_origem: parseDate(raw.datahoraultimaalteracao) || parseDate(raw.datahoracadastro),
      imoview_raw: raw,
    },
  };
}

// ---------- Storage mirror ----------
async function mirrorPhoto(sb: ReturnType<typeof createClient>, codigo: number, idx: number, url: string): Promise<string | null> {
  try {
    const u = new URL(url);
    const ext = (u.pathname.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "jpg";
    const path = `imoview/${codigo}/${String(idx).padStart(2, "0")}-${slug(u.pathname)}.${ext}`;

    // Skip se já existe
    const { data: existing } = await sb.storage.from("imoveis-fotos").list(`imoview/${codigo}`, { search: `${String(idx).padStart(2, "0")}-` });
    if (existing && existing.some((f) => f.name.startsWith(`${String(idx).padStart(2, "0")}-`))) {
      const { data: pub } = sb.storage.from("imoveis-fotos").getPublicUrl(path);
      return pub.publicUrl;
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || `image/${ext === "jpg" ? "jpeg" : ext}`;

    const { error } = await sb.storage.from("imoveis-fotos").upload(path, buf, {
      contentType, upsert: true, cacheControl: "31536000",
    });
    if (error) {
      console.error(`[sync] upload foto ${path}:`, error.message);
      return null;
    }
    const { data: pub } = sb.storage.from("imoveis-fotos").getPublicUrl(path);
    return pub.publicUrl;
  } catch (e) {
    console.error(`[sync] mirror foto erro:`, e);
    return null;
  }
}

// ---------- processamento de um imóvel ----------
async function persistStats(
  sb: ReturnType<typeof createClient>,
  syncId: string,
  delta: { inserted?: number; updated?: number; unchanged?: number; photos?: number; errors?: number; total?: number },
) {
  try {
    const { data: cur } = await sb.from("imoview_sync_log")
      .select("inserted, updated, unchanged, photos_uploaded, errors_count, total")
      .eq("id", syncId).single();
    await sb.from("imoview_sync_log").update({
      inserted: (cur?.inserted || 0) + (delta.inserted || 0),
      updated: (cur?.updated || 0) + (delta.updated || 0),
      unchanged: (cur?.unchanged || 0) + (delta.unchanged || 0),
      photos_uploaded: (cur?.photos_uploaded || 0) + (delta.photos || 0),
      errors_count: (cur?.errors_count || 0) + (delta.errors || 0),
      total: (cur?.total || 0) + (delta.total || 0),
      updated_at: new Date().toISOString(),
    }).eq("id", syncId);
  } catch (e) {
    console.error("[sync] persistStats falhou:", e);
  }
}

async function syncOne(
  sb: ReturnType<typeof createClient>,
  raw: Record<string, unknown>,
  stats: { inserted: number; updated: number; unchanged: number; photos: number; errors: number },
  syncId: string | null,
  forceInativo = false,
) {
  try {
    const mapped = mapToRow(raw);
    if (!mapped.codigo) return;

    if (forceInativo) {
      mapped.payload.status = "inativo";
      mapped.payload.ativo = false;
    }

    const hash = await sha256Hex(JSON.stringify(mapped.payload));

    const { data: existing } = await sb
      .from("imoveis_proprios")
      .select("id, imoview_hash, fotos")
      .eq("codigo_imoview", mapped.codigo)
      .maybeSingle();

    if (existing && existing.imoview_hash === hash) {
      stats.unchanged++;
      await sb.from("imoveis_proprios").update({
        imoview_sync_at: new Date().toISOString(),
        ...(forceInativo ? { ativo: false, status: "inativo" } : { ativo: true }),
      }).eq("id", existing.id);
      if (syncId) await persistStats(sb, syncId, { unchanged: 1 });
      return;
    }

    const fotosOrigem = mapped.fotosUrls.length > 0
      ? mapped.fotosUrls
      : ((existing?.fotos as string[] | undefined) || []);
    const baseRow = {
      ...mapped.payload,
      fotos: fotosOrigem,
      imoview_hash: hash,
      imoview_sync_at: new Date().toISOString(),
    };

    if (existing) {
      await sb.from("imoveis_proprios").update(baseRow).eq("id", existing.id);
      stats.updated++;
      if (syncId) await persistStats(sb, syncId, { updated: 1 });
    } else {
      await sb.from("imoveis_proprios").insert(baseRow);
      stats.inserted++;
      if (syncId) await persistStats(sb, syncId, { inserted: 1 });
    }

  } catch (e) {
    stats.errors++;
    if (syncId) await persistStats(sb, syncId, { errors: 1 });
    console.error(`[sync] erro processando imovel:`, e);
  }
}


// ---------- handler principal ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { mode = "full", sync_id, codigo, internal_cursor } = body as {
      mode?: "full" | "incremental" | "single" | "desativados";
      sync_id?: string;
      codigo?: number;
      internal_cursor?: { finalidadeIdx: number; pagina: number };
    };
    const isDesat = mode === "desativados";

    // ===== modo single =====
    if (mode === "single") {
      if (!codigo) return new Response(JSON.stringify({ error: "codigo obrigatório" }), { status: 400, headers: corsHeaders });
      const detail = await fetchDetails(codigo);
      if (!detail) return new Response(JSON.stringify({ error: "não encontrado" }), { status: 404, headers: corsHeaders });
      const stats = { inserted: 0, updated: 0, unchanged: 0, photos: 0, errors: 0 };
      await syncOne(sb, detail, stats, null);
      return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== iniciar log se primeira chamada =====
    let activeSyncId = sync_id;
    let cursor = internal_cursor;

    if (!activeSyncId) {
      // pegar user que disparou
      const auth = req.headers.get("Authorization") || "";
      let userId: string | null = null;
      if (auth.startsWith("Bearer ")) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
        const { data } = await userClient.auth.getUser();
        userId = data.user?.id ?? null;
      }

      const { data: log, error } = await sb
        .from("imoview_sync_log")
        .insert({ status: "running", mode, triggered_by: userId, cursor: { finalidadeIdx: 0, pagina: 1 } })
        .select("id")
        .single();
      if (error) throw error;
      activeSyncId = log.id as string;
      cursor = { finalidadeIdx: 0, pagina: 1 };

      // resposta imediata; processamento continua em background
      const taskBody = { mode, sync_id: activeSyncId, internal_cursor: cursor };
      const selfUrl = `${SUPABASE_URL}/functions/v1/imoview-sync`;
      (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(
        fetch(selfUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify(taskBody),
        }).then((r) => r.text()).catch((e) => console.error("[sync] self-invoke:", e)),
      );
      return new Response(JSON.stringify({ ok: true, sync_id: activeSyncId, status: "running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== execução do chunk =====
    const stats = { inserted: 0, updated: 0, unchanged: 0, photos: 0, errors: 0 };
    let { finalidadeIdx = 0, pagina = 1 } = cursor || {};
    let pagesProcessed = 0;
    let totalSeen = 0;
    let done = false;

    while (pagesProcessed < PAGES_PER_CHUNK && finalidadeIdx < FINALIDADES.length) {
      const fin = FINALIDADES[finalidadeIdx];
      const lista = isDesat ? await fetchListingDesativados(fin, pagina) : await fetchListing(fin, pagina);
      console.log(`[sync${isDesat ? '-desat' : ''}] fin=${fin} pag=${pagina} -> ${lista.length} itens`);
      totalSeen += lista.length;

      if (lista.length === 0) {
        finalidadeIdx++;
        pagina = 1;
        await sb.from("imoview_sync_log").update({ cursor: { finalidadeIdx, pagina }, updated_at: new Date().toISOString() }).eq("id", activeSyncId);
        continue;
      }


      // Buscar detalhes em paralelo (concorrência limitada)
      const codigos = lista.map(pickCodigo).filter((n) => n > 0);
      if (codigos.length === 0 && lista.length > 0) {
        console.warn(`[sync] sem codigo em ${lista.length} itens. Keys do primeiro:`, Object.keys(lista[0]).sort().join(","));
      }
      const conc = 3;
      for (let i = 0; i < codigos.length; i += conc) {
        const slice = codigos.slice(i, i + conc);
        const details = await Promise.all(slice.map((c) => fetchDetails(c)));
        for (const d of details) {
          if (d) await syncOne(sb, d, stats, activeSyncId!, isDesat);
        }
      }


      pagesProcessed++;
      if (lista.length < PAGE_SIZE) {
        finalidadeIdx++;
        pagina = 1;
      } else {
        pagina++;
      }

      // Persistir cursor + total a cada página (sobrevive a timeout)
      const { data: curTotal } = await sb.from("imoview_sync_log").select("total").eq("id", activeSyncId).single();
      await sb.from("imoview_sync_log").update({
        cursor: { finalidadeIdx, pagina },
        total: (curTotal?.total || 0) + lista.length,
        updated_at: new Date().toISOString(),
      }).eq("id", activeSyncId);
    }

    if (finalidadeIdx >= FINALIDADES.length) done = true;

    // Final do chunk: counts já foram persistidos por persistStats dentro de syncOne.
    // Apenas atualizar cursor e, se done, finalizar com removidos/status.
    const update: Record<string, unknown> = {
      cursor: { finalidadeIdx, pagina },
      updated_at: new Date().toISOString(),
    };

    if (done) {
      const startedAtRes = await sb.from("imoview_sync_log").select("started_at, errors_count").eq("id", activeSyncId).single();
      const startedAt = startedAtRes.data?.started_at as string | undefined;
      if (startedAt) {
        const { data: stale, count } = await sb
          .from("imoveis_proprios")
          .update({ ativo: false, status: "inativo" }, { count: "exact" })
          .eq("origem", "imoview")
          .or(`imoview_sync_at.is.null,imoview_sync_at.lt.${startedAt}`)
          .select("id");
        update.removed = (stale?.length ?? count) || 0;
      }
      update.status = (startedAtRes.data?.errors_count || 0) > 0 ? "partial" : "ok";
      update.finished_at = new Date().toISOString();
    }

    await sb.from("imoview_sync_log").update(update).eq("id", activeSyncId);


    if (!done) {
      // re-invocar para próximo chunk
      const selfUrl = `${SUPABASE_URL}/functions/v1/imoview-sync`;
      (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(
        fetch(selfUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ mode, sync_id: activeSyncId, internal_cursor: { finalidadeIdx, pagina } }),
        }).then((r) => r.text()).catch((e) => console.error("[sync] self-invoke chunk:", e)),
      );
    }

    return new Response(JSON.stringify({ ok: true, sync_id: activeSyncId, done, stats, cursor: { finalidadeIdx, pagina } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[sync] fatal:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
