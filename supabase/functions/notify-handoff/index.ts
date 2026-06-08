import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const EDER_ID = "5703f01d-c06a-4cda-9562-e136fdde7a8f";

function toE164(phone: string): string | null {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55")) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return `+${d}`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
  } catch { return String(n); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    const ZIONTALK_API_KEY = Deno.env.get("ZIONTALK_API_KEY");

    const provided = req.headers.get("x-internal-secret");
    if (!CRON_SECRET || provided !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ZIONTALK_API_KEY) throw new Error("ZIONTALK_API_KEY missing");

    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: lead } = await admin.from("leads")
      .select("id, nome, telefone, imovel_interesse_codigo, cidade_interesse, bairro_interesse, tipo_imovel, finalidade, orcamento_max, ia_handoff_motivo")
      .eq("id", lead_id).maybeSingle();

    if (!lead) {
      return new Response(JSON.stringify({ error: "lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imovelInfo = "—";
    const codigo = lead.imovel_interesse_codigo;
    if (codigo) {
      let cod: number | null = null;
      try { cod = parseInt(String(codigo), 10); } catch { /* ignore */ }
      if (cod && !isNaN(cod)) {
        const { data: im } = await admin.from("imoveis_proprios")
          .select("codigo_imoview, tipo, bairro, cidade, valor_venda, valor_locacao")
          .eq("codigo_imoview", cod).maybeSingle();
        if (im) {
          const valor = im.valor_venda || im.valor_locacao;
          imovelInfo = `#${im.codigo_imoview} — ${im.tipo ?? lead.tipo_imovel ?? "—"} em ${im.bairro ?? "—"}/${im.cidade ?? "—"}${valor ? ` (${fmtMoney(valor)})` : ""}`;
        } else {
          imovelInfo = `#${codigo} (não encontrado na base)`;
        }
      } else {
        imovelInfo = String(codigo);
      }
    } else if (lead.tipo_imovel || lead.bairro_interesse || lead.cidade_interesse) {
      imovelInfo = `${lead.tipo_imovel ?? "—"} em ${lead.bairro_interesse ?? "—"}/${lead.cidade_interesse ?? "—"}`;
    }

    const { data: eder } = await admin.from("profiles")
      .select("telefone, nome, ativo")
      .eq("id", EDER_ID).maybeSingle();

    if (!eder?.telefone) {
      console.warn("Eder profile/phone missing");
      return new Response(JSON.stringify({ skipped: true, reason: "no recipient phone" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = toE164(eder.telefone);
    if (!phone) {
      return new Response(JSON.stringify({ skipped: true, reason: "invalid phone" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("CRM_BASE_URL") ?? "https://vipsevenimoveis.com.br";
    const msg =
      `🚨 *Lead em handoff — atenção necessária*\n\n` +
      `*Lead:* ${lead.nome ?? "—"} (${lead.telefone ?? "—"})\n` +
      `*Imóvel de interesse:* ${imovelInfo}\n` +
      `*Finalidade:* ${lead.finalidade ?? "—"}\n` +
      `*Orçamento:* ${fmtMoney(lead.orcamento_max as any)}\n` +
      `*Motivo:* ${lead.ia_handoff_motivo ?? "—"}\n\n` +
      `Abra no CRM: ${baseUrl}/crm/leads/${lead.id}`;

    const form = new FormData();
    form.append("msg", msg);
    form.append("mobile_phone", phone);

    const basic = btoa(`${ZIONTALK_API_KEY}:`);
    const res = await fetch("https://app.ziontalk.com/api/send_message/", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
      body: form,
    });
    const text = await res.text();
    let out: any = null;
    try { out = JSON.parse(text); } catch { out = { raw: text }; }

    if (!res.ok) {
      console.error("ZionTalk error", res.status, out);
      return new Response(JSON.stringify({ ok: false, error: out }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, response: out }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-handoff error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
