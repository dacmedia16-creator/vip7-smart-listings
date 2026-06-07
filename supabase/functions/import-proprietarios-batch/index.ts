// Importa proprietários a partir de CSV no bucket lead-documentos.
// One-shot: roda a lógica de upsert cliente + vínculo cliente_imoveis(papel='proprietario').
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OwnerRow = {
  codigo_imovel: number;
  o_codigo: number | null;
  o_doc: string | null;
  o_nome: string;
  o_email: string | null;
  o_tel: string | null;
  o_tel2: string | null;
  o_obs: string | null;
};

function parseCsv(text: string): OwnerRow[] {
  const out: OwnerRow[] = [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  // skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // simple CSV parser (no embedded commas/quotes used here other than via escaping)
    const fields: string[] = [];
    let cur = "", inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (inQ) {
        if (ch === '"' && line[j+1] === '"') { cur += '"'; j++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { fields.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    fields.push(cur);
    const [codigo_imovel, o_codigo, o_doc, o_nome, o_email, o_tel, o_tel2, o_obs] = fields;
    out.push({
      codigo_imovel: Number(codigo_imovel),
      o_codigo: o_codigo ? Number(o_codigo) : null,
      o_doc: o_doc || null,
      o_nome: o_nome || "",
      o_email: o_email || null,
      o_tel: o_tel || null,
      o_tel2: o_tel2 || null,
      o_obs: o_obs || null,
    });
  }
  return out;
}

function ownerKey(r: OwnerRow): string {
  if (r.o_doc) return "doc|" + r.o_doc;
  if (r.o_codigo) return "cod|" + r.o_codigo;
  return "nm|" + (r.o_nome || "").toLowerCase().trim() + "|" + (r.o_tel || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) baixa CSV do bucket
    const { data: file, error: dlErr } = await admin.storage
      .from("lead-documentos")
      .download("_tmp_import/staging_owners.csv");
    if (dlErr) throw dlErr;
    const text = await file.text();
    const rows = parseCsv(text);

    // 2) carrega mapa codigo_imoview -> id (imóveis)
    const imovelByCodigo = new Map<number, string>();
    {
      let from = 0; const pageSize = 1000;
      while (true) {
        const { data, error } = await admin
          .from("imoveis_proprios")
          .select("id, codigo_imoview")
          .not("codigo_imoview", "is", null)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const chunk = (data || []) as { id: string; codigo_imoview: number }[];
        for (const r of chunk) imovelByCodigo.set(r.codigo_imoview, r.id);
        if (chunk.length < pageSize) break;
        from += pageSize;
      }
    }

    // 3) dedupe owners
    const ownerByKey = new Map<string, OwnerRow>();
    for (const r of rows) {
      const k = ownerKey(r);
      if (!ownerByKey.has(k)) ownerByKey.set(k, r);
    }

    // 4) carrega clientes existentes (por codigo_imoview e cpf_cnpj)
    const cliByCodigo = new Map<number, string>();
    const cliByDoc = new Map<string, string>();
    {
      let from = 0; const pageSize = 1000;
      while (true) {
        const { data, error } = await admin
          .from("clientes")
          .select("id, codigo_imoview, cpf_cnpj")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const chunk = (data || []) as { id: string; codigo_imoview: number | null; cpf_cnpj: string | null }[];
        for (const r of chunk) {
          if (r.codigo_imoview != null) cliByCodigo.set(r.codigo_imoview, r.id);
          if (r.cpf_cnpj) cliByDoc.set(r.cpf_cnpj, r.id);
        }
        if (chunk.length < pageSize) break;
        from += pageSize;
      }
    }

    // 5) processa owners únicos: upsert clientes
    const keyToClienteId = new Map<string, string>();
    let cliNovos = 0, cliAtualizados = 0;
    const erros: { motivo: string; nome?: string }[] = [];

    for (const [k, r] of ownerByKey) {
      try {
        let cliId: string | undefined;
        if (r.o_codigo && cliByCodigo.has(r.o_codigo)) cliId = cliByCodigo.get(r.o_codigo);
        else if (r.o_doc && cliByDoc.has(r.o_doc)) cliId = cliByDoc.get(r.o_doc);

        if (cliId) {
          // fetch current to merge categorias e preencher nulls
          const { data: cur } = await admin.from("clientes").select("nome,email,telefone,telefone_secundario,cpf_cnpj,codigo_imoview,observacoes,categorias").eq("id", cliId).single();
          const cats = new Set<string>([...(cur?.categorias || []), "proprietario"]);
          const patch: Record<string, unknown> = {
            categorias: Array.from(cats),
            imoview_sync_at: new Date().toISOString(),
          };
          if (!cur?.nome && r.o_nome) patch.nome = r.o_nome;
          if (!cur?.email && r.o_email) patch.email = r.o_email;
          if (!cur?.telefone && r.o_tel) patch.telefone = r.o_tel;
          if (!cur?.telefone_secundario && r.o_tel2) patch.telefone_secundario = r.o_tel2;
          if (!cur?.cpf_cnpj && r.o_doc) patch.cpf_cnpj = r.o_doc;
          if (cur?.codigo_imoview == null && r.o_codigo != null) patch.codigo_imoview = r.o_codigo;
          if (!cur?.observacoes && r.o_obs) patch.observacoes = r.o_obs;
          const { error } = await admin.from("clientes").update(patch).eq("id", cliId);
          if (error) throw error;
          cliAtualizados++;
        } else {
          const { data, error } = await admin.from("clientes").insert({
            nome: r.o_nome,
            tipo_pessoa: (r.o_doc && r.o_doc.length === 14) ? "juridica" : "fisica",
            cpf_cnpj: r.o_doc,
            email: r.o_email,
            telefone: r.o_tel,
            telefone_secundario: r.o_tel2,
            codigo_imoview: r.o_codigo,
            observacoes: r.o_obs,
            categorias: ["proprietario"],
            origem: "imoview_planilha",
            imoview_sync_at: new Date().toISOString(),
          }).select("id").single();
          if (error) throw error;
          cliId = (data as { id: string }).id;
          if (r.o_codigo != null) cliByCodigo.set(r.o_codigo, cliId);
          if (r.o_doc) cliByDoc.set(r.o_doc, cliId);
          cliNovos++;
        }
        keyToClienteId.set(k, cliId!);
      } catch (e) {
        erros.push({ motivo: (e as Error).message, nome: r.o_nome });
      }
    }

    // 6) cria vínculos cliente_imoveis (papel=proprietario) para todos os pares
    let vincNovos = 0, vincJaExistiam = 0, vincErros = 0;
    const imovsAusentes = new Set<number>();

    // batch the upserts
    const batch: { cliente_id: string; imovel_id: string; papel: string }[] = [];
    for (const r of rows) {
      const imovelId = imovelByCodigo.get(r.codigo_imovel);
      if (!imovelId) { imovsAusentes.add(r.codigo_imovel); continue; }
      const cliId = keyToClienteId.get(ownerKey(r));
      if (!cliId) continue;
      batch.push({ cliente_id: cliId, imovel_id: imovelId, papel: "proprietario" });
    }

    // upsert em chunks de 200
    for (let i = 0; i < batch.length; i += 200) {
      const chunk = batch.slice(i, i + 200);
      const { error, count } = await admin
        .from("cliente_imoveis")
        .upsert(chunk, { onConflict: "cliente_id,imovel_id,papel", ignoreDuplicates: true, count: "exact" });
      if (error) { vincErros += chunk.length; erros.push({ motivo: "vinculo batch: " + error.message }); }
      else vincNovos += (count ?? 0);
    }
    vincJaExistiam = batch.length - vincNovos - vincErros;

    return new Response(JSON.stringify({
      ok: true,
      planilha_linhas_owner: rows.length,
      owners_unicos: ownerByKey.size,
      imoveis_no_banco: imovelByCodigo.size,
      imoveis_ausentes: imovsAusentes.size,
      imoveis_ausentes_amostra: Array.from(imovsAusentes).slice(0, 30),
      clientes_novos: cliNovos,
      clientes_atualizados: cliAtualizados,
      vinculos_pares_total: batch.length,
      vinculos_novos: vincNovos,
      vinculos_ja_existiam: vincJaExistiam,
      erros: erros.slice(0, 20),
      total_erros: erros.length,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, stack: (e as Error).stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
