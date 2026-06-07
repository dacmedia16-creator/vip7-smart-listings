// Import manual de clientes via planilha (CSV/XLSX exportada do Imoview).
// Recebe { rows, mapping, batchIndex?, totalBatches? } — chamado em lotes pelo frontend.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const onlyDigits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const norm = (s: unknown) => String(s ?? "").trim();
const lower = (s: unknown) => norm(s).toLowerCase();
const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function get(row: Record<string, unknown>, col: string | null | undefined): string {
  if (!col) return "";
  const v = row[col];
  return v == null ? "" : String(v).trim();
}

function parseCategorias(v: string): string[] {
  if (!v) return [];
  return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

function parseDate(v: string): string | null {
  if (!v) return null;
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = v.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return v.slice(0, 10);
  return null;
}

function normalizeFinalidade(v: string): string | null {
  const x = stripAccents(v);
  if (!x) return null;
  if (x.includes("loca") || x.includes("alug")) return "locacao";
  if (x.includes("vend")) return "venda";
  if (x.includes("temp")) return "temporada";
  return null;
}

function mapStatusFunil(situacao: string, fase: string): string {
  const s = stripAccents(situacao);
  const f = stripAccents(fase);
  const all = `${s} ${f}`;
  if (all.includes("perd") || all.includes("cancel") || all.includes("descart")) return "perdido";
  if (all.includes("fech") || all.includes("ganho") || all.includes("conclu") || all.includes("vendido")) return "fechamento";
  if (all.includes("propost") || all.includes("negoci")) return "proposta";
  if (all.includes("visit")) return "visita";
  if (all.includes("qualif") || all.includes("atend") || all.includes("andamento")) return "qualificacao";
  return "novo";
}

type Papel = "proprietario" | "comprador" | "locatario" | "interessado";

function inferPapel(situacao: string, finalidade: string): Papel {
  const t = stripAccents(`${situacao} ${finalidade}`);
  if (t.includes("capta") || t.includes("propriet")) return "proprietario";
  if (t.includes("loca") || t.includes("alug") || t.includes("inquil")) return "locatario";
  if (t.includes("vend") || t.includes("compr")) return "comprador";
  return "interessado";
}

type Mapping = Record<string, string | null>;

function buildCliente(row: Record<string, unknown>, mapping: Mapping, userId: string | null) {
  const nome = norm(get(row, mapping.nome));
  if (!nome) return { error: "nome vazio" as const };

  const doc = onlyDigits(get(row, mapping.cpf_cnpj));
  const tipo_pessoa =
    norm(get(row, mapping.tipo_pessoa)).toLowerCase().startsWith("j") || doc.length === 14
      ? "juridica"
      : "fisica";

  const email = lower(get(row, mapping.email)) || null;
  const telefone = onlyDigits(get(row, mapping.telefone)) || null;
  const telefone_secundario = onlyDigits(get(row, mapping.telefone_secundario)) || null;
  const codigoStr = onlyDigits(get(row, mapping.codigo_imoview));
  const codigo_imoview = codigoStr ? parseInt(codigoStr, 10) : null;

  const categorias = parseCategorias(get(row, mapping.categorias));

  const cliente = {
    nome,
    tipo_pessoa,
    cpf_cnpj: doc || null,
    rg: norm(get(row, mapping.rg)) || null,
    email,
    telefone,
    telefone_secundario,
    data_nascimento: parseDate(get(row, mapping.data_nascimento)),
    endereco: norm(get(row, mapping.endereco)) || null,
    numero: norm(get(row, mapping.numero)) || null,
    complemento: norm(get(row, mapping.complemento)) || null,
    bairro: norm(get(row, mapping.bairro)) || null,
    cidade: norm(get(row, mapping.cidade)) || null,
    estado: norm(get(row, mapping.estado)).toUpperCase().slice(0, 2) || null,
    cep: onlyDigits(get(row, mapping.cep)) || null,
    observacoes: norm(get(row, mapping.observacoes)) || null,
    categorias,
    codigo_imoview,
    origem: "imoview_csv",
    imoview_sync_at: new Date().toISOString(),
    ativo: true,
    created_by: userId,
  };
  return { cliente };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      rows: Record<string, unknown>[];
      mapping: Mapping;
      batchIndex?: number;
      rowOffset?: number;
    };
    const { rows, mapping } = body;
    const rowOffset = body.rowOffset ?? 0;

    if (!Array.isArray(rows) || !mapping || !mapping.nome) {
      return new Response(JSON.stringify({ error: "Payload inválido: requer rows[] e mapping.nome" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rows.length > 1000) {
      return new Response(JSON.stringify({ error: "Lote excede 1000 linhas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let inseridos = 0,
      atualizados = 0,
      ignorados = 0,
      leads_inseridos = 0,
      leads_atualizados = 0,
      vinculos_criados = 0,
      vinculos_ignorados_sem_imovel = 0;
    const corretores_nao_encontrados = new Set<string>();
    const codigos_imoveis_nao_encontrados = new Set<number>();
    const erros: { linha: number; motivo: string }[] = [];

    // Pré-carrega códigos imoview e CPFs existentes
    const codigos = rows
      .map((r) => onlyDigits(get(r, mapping.codigo_imoview)))
      .filter(Boolean)
      .map((s) => parseInt(s, 10));
    const docs = rows.map((r) => onlyDigits(get(r, mapping.cpf_cnpj))).filter(Boolean);

    const existingByCodigo = new Map<number, string>();
    const existingByDoc = new Map<string, string>();
    if (codigos.length) {
      const { data } = await admin
        .from("clientes")
        .select("id, codigo_imoview")
        .in("codigo_imoview", codigos);
      for (const r of (data as { id: string; codigo_imoview: number }[]) ?? []) {
        existingByCodigo.set(r.codigo_imoview, r.id);
      }
    }
    if (docs.length) {
      const { data } = await admin.from("clientes").select("id, cpf_cnpj").in("cpf_cnpj", docs);
      for (const r of (data as { id: string; cpf_cnpj: string }[]) ?? []) {
        existingByDoc.set(r.cpf_cnpj, r.id);
      }
    }

    // Pré-carrega imóveis por código_imoview presentes no lote
    const codigosImoveis = Array.from(
      new Set(
        rows
          .map((r) => onlyDigits(get(r, mapping.codigo_imovel)))
          .filter(Boolean)
          .map((s) => parseInt(s, 10)),
      ),
    );
    const imovelByCodigo = new Map<number, string>();
    if (codigosImoveis.length) {
      const { data } = await admin
        .from("imoveis_proprios")
        .select("id, codigo_imoview")
        .in("codigo_imoview", codigosImoveis);
      for (const r of (data as { id: string; codigo_imoview: number }[]) ?? []) {
        imovelByCodigo.set(r.codigo_imoview, r.id);
      }
    }

    // Pré-carrega profiles para resolver corretor por nome
    const corretorByName = new Map<string, string>();
    if (mapping.corretor_nome) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, nome")
        .eq("ativo", true);
      for (const p of (profiles as { id: string; nome: string }[]) ?? []) {
        corretorByName.set(stripAccents(p.nome), p.id);
      }
    }

    // Pré-carrega leads existentes por codigo_atendimento (guardado em imovel_interesse_codigo)
    const codigosAtend = rows
      .map((r) => norm(get(r, mapping.codigo_atendimento)))
      .filter(Boolean);
    const existingLeadByCodAtend = new Map<string, string>();
    if (codigosAtend.length) {
      const { data } = await admin
        .from("leads")
        .select("id, imovel_interesse_codigo")
        .in("imovel_interesse_codigo", codigosAtend);
      for (const r of (data as { id: string; imovel_interesse_codigo: string }[]) ?? []) {
        if (r.imovel_interesse_codigo) existingLeadByCodAtend.set(r.imovel_interesse_codigo, r.id);
      }
    }

    for (let j = 0; j < rows.length; j++) {
      const idx = rowOffset + j;
      const row = rows[j];
      const built = buildCliente(row, mapping, userId);
      if ("error" in built) {
        ignorados++;
        erros.push({ linha: idx + 2, motivo: built.error });
        continue;
      }
      const c = built.cliente;
      let clienteId: string | undefined;
      if (c.codigo_imoview && existingByCodigo.has(c.codigo_imoview)) {
        clienteId = existingByCodigo.get(c.codigo_imoview);
      } else if (c.cpf_cnpj && existingByDoc.has(c.cpf_cnpj)) {
        clienteId = existingByDoc.get(c.cpf_cnpj);
      }

      if (clienteId) {
        const { error } = await admin.from("clientes").update(c).eq("id", clienteId);
        if (error) {
          ignorados++;
          erros.push({ linha: idx + 2, motivo: `update cliente: ${error.message}` });
          continue;
        }
        atualizados++;
      } else {
        const { data, error } = await admin.from("clientes").insert(c).select("id").single();
        if (error) {
          ignorados++;
          erros.push({ linha: idx + 2, motivo: `insert cliente: ${error.message}` });
          continue;
        }
        inseridos++;
        clienteId = (data as { id: string }).id;
        if (c.codigo_imoview) existingByCodigo.set(c.codigo_imoview, clienteId!);
        if (c.cpf_cnpj) existingByDoc.set(c.cpf_cnpj, clienteId!);
      }

      const situacao = norm(get(row, mapping.situacao));
      const fase = norm(get(row, mapping.fase_atendimento));
      const finalidadeRaw = get(row, mapping.finalidade);
      const finalidade = normalizeFinalidade(finalidadeRaw);

      // Vincula imóvel ao cliente (cliente_imoveis)
      const codImovStr = onlyDigits(get(row, mapping.codigo_imovel));
      const codImov = codImovStr ? parseInt(codImovStr, 10) : null;
      if (codImov) {
        const imovelId = imovelByCodigo.get(codImov);
        if (!imovelId) {
          vinculos_ignorados_sem_imovel++;
          codigos_imoveis_nao_encontrados.add(codImov);
        } else {
          const papel = inferPapel(situacao, finalidadeRaw);
          const { error: vErr } = await admin.from("cliente_imoveis").upsert(
            { cliente_id: clienteId, imovel_id: imovelId, papel },
            { onConflict: "cliente_id,imovel_id,papel" },
          );
          if (vErr) {
            erros.push({ linha: idx + 2, motivo: `vinculo: ${vErr.message}` });
          } else {
            vinculos_criados++;
          }
        }
      }

      // Lead opcional (quando há código de atendimento)
      const codAtend = norm(get(row, mapping.codigo_atendimento));
      if (codAtend && c.telefone) {
        const corretorNome = norm(get(row, mapping.corretor_nome));
        let corretor_id: string | null = null;
        if (corretorNome) {
          const k = stripAccents(corretorNome);
          corretor_id = corretorByName.get(k) ?? null;
          if (!corretor_id) {
            // tenta match parcial
            for (const [n, id] of corretorByName) {
              if (n.includes(k) || k.includes(n)) { corretor_id = id; break; }
            }
          }
          if (!corretor_id) corretores_nao_encontrados.add(corretorNome);
        }

        const status_funil = mapStatusFunil(situacao, fase);

        const lead = {
          nome: c.nome,
          email: c.email,
          telefone: c.telefone,
          finalidade,
          status_funil,
          corretor_id,
          origem: "manual" as const,
          imovel_interesse_codigo: codImov ? String(codImov) : codAtend,
          observacoes: `[Imoview atend #${codAtend}${codImov ? ` · imóvel #${codImov}` : ""}] ${situacao || "-"} · ${fase || "-"}`,
          created_by: userId,
        };

        const existingLeadId = existingLeadByCodAtend.get(codAtend);
        if (existingLeadId) {
          const { error } = await admin.from("leads").update(lead).eq("id", existingLeadId);
          if (error) erros.push({ linha: idx + 2, motivo: `update lead: ${error.message}` });
          else leads_atualizados++;
        } else {
          const { data, error } = await admin.from("leads").insert(lead).select("id").single();
          if (error) erros.push({ linha: idx + 2, motivo: `insert lead: ${error.message}` });
          else {
            leads_inseridos++;
            existingLeadByCodAtend.set(codAtend, (data as { id: string }).id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inseridos,
        atualizados,
        ignorados,
        leads_inseridos,
        leads_atualizados,
        vinculos_criados,
        vinculos_ignorados_sem_imovel,
        codigos_imoveis_nao_encontrados: Array.from(codigos_imoveis_nao_encontrados).slice(0, 50),
        corretores_nao_encontrados: Array.from(corretores_nao_encontrados),
        erros,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
