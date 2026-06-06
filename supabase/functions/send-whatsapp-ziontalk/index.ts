import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tipo = "lead_atribuido" | "mudanca_etapa" | "nova_tarefa";

interface Payload {
  recipientUserId: string;
  tipo: Tipo;
  data: Record<string, any>;
}

function renderMsg(tipo: Tipo, d: Record<string, any>): string {
  if (tipo === "lead_atribuido") {
    return `🆕 *Novo lead atribuído*\n\n` +
      `*Nome:* ${d.lead_nome ?? "—"}\n` +
      `*Telefone:* ${d.lead_telefone ?? "—"}\n` +
      `*Origem:* ${d.origem ?? "—"}\n\n` +
      `Abra no CRM: ${d.url ?? ""}`;
  }
  if (tipo === "mudanca_etapa") {
    return `🔁 *Mudança de etapa*\n\n` +
      `Lead: *${d.lead_nome ?? "—"}*\n` +
      `${d.from ?? "—"} → *${d.to ?? "—"}*\n\n` +
      `${d.url ?? ""}`;
  }
  return `✅ *Nova tarefa*\n\n` +
    `*${d.titulo ?? "—"}*\n` +
    `Quando: ${d.data_hora ?? "—"}\n` +
    `Prioridade: ${d.prioridade ?? "—"}`;
}

function toE164(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZIONTALK_API_KEY = Deno.env.get("ZIONTALK_API_KEY");
    if (!ZIONTALK_API_KEY) throw new Error("ZIONTALK_API_KEY missing");

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Payload = await req.json();
    if (!body.recipientUserId || !body.tipo) {
      return new Response(JSON.stringify({ error: "recipientUserId e tipo são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile } = await admin.from("profiles")
      .select("telefone, nome, notif_whatsapp, ativo")
      .eq("id", body.recipientUserId).maybeSingle();

    if (!profile?.telefone || !profile.ativo || profile.notif_whatsapp === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "no phone or opted out" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = toE164(profile.telefone);
    if (!phone) {
      return new Response(JSON.stringify({ skipped: true, reason: "invalid phone" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msg = renderMsg(body.tipo, body.data ?? {});
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
      return new Response(JSON.stringify({ error: out, status: res.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, response: out }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
