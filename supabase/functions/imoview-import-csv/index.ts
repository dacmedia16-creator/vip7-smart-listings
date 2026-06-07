// Import manual de clientes via planilha (CSV/XLSX exportada do Imoview).
// Recebe { rows: Array<Record<string,string>>, mapping: Record<string, string|null> }
// onde `mapping[campoCRM] = nomeDaColunaNaPlanilha`.
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
  // dd/mm/yyyy → yyyy-mm-dd; ou já ISO
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = v.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return v.slice(0, 10);
  return null;
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
    imoview_raw: row as unknown,
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

    const { rows, mapping } = (await req.json()) as { rows: Record<string, unknown>[]; mapping: Mapping };
    if (!Array.isArray(rows) || !mapping || !mapping.nome) {
      return new Response(JSON.stringify({ error: "Payload inválido: requer rows[] e mapping.nome" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rows.length > 10000) {
      return new Response(JSON.stringify({ error: "Limite de 10.000 linhas por upload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Log inicial
    const { data: logRow } = await admin
      .from("imoview_sync_log")
      .insert({ mode: "csv_manual", status: "running", triggered_by: userId, total: rows.length })
      .select("id")
      .single();
    const logId = (logRow as { id: string } | null)?.id;

    let inseridos = 0,
      atualizados = 0,
      ignorados = 0;
    const erros: { linha: number; motivo: string }[] = [];

    // Pré-carrega códigos imoview já existentes para distinguir insert/update rapidamente
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

    // Processa em chunks
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      for (let j = 0; j < slice.length; j++) {
        const idx = i + j;
        const row = slice[j];
        const built = buildCliente(row, mapping, userId);
        if ("error" in built) {
          ignorados++;
          erros.push({ linha: idx + 2, motivo: built.error });
          continue;
        }
        const c = built.cliente;
        let existingId: string | undefined;
        if (c.codigo_imoview && existingByCodigo.has(c.codigo_imoview)) {
          existingId = existingByCodigo.get(c.codigo_imoview);
        } else if (c.cpf_cnpj && existingByDoc.has(c.cpf_cnpj)) {
          existingId = existingByDoc.get(c.cpf_cnpj);
        }

        if (existingId) {
          const { error } = await admin.from("clientes").update(c).eq("id", existingId);
          if (error) {
            ignorados++;
            erros.push({ linha: idx + 2, motivo: `update: ${error.message}` });
          } else {
            atualizados++;
          }
        } else {
          const { data, error } = await admin.from("clientes").insert(c).select("id").single();
          if (error) {
            ignorados++;
            erros.push({ linha: idx + 2, motivo: `insert: ${error.message}` });
          } else {
            inseridos++;
            const newId = (data as { id: string }).id;
            if (c.codigo_imoview) existingByCodigo.set(c.codigo_imoview, newId);
            if (c.cpf_cnpj) existingByDoc.set(c.cpf_cnpj, newId);
          }
        }
      }
    }

    if (logId) {
      await admin
        .from("imoview_sync_log")
        .update({
          status: erros.length === 0 ? "ok" : "partial",
          finished_at: new Date().toISOString(),
          total: rows.length,
          inserted: inseridos,
          updated: atualizados,
          errors_count: erros.length,
          error_details: erros.length ? { erros: erros.slice(0, 200) } : null,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ ok: true, inseridos, atualizados, ignorados, erros, sync_id: logId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
