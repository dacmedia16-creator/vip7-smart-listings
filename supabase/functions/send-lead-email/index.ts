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

function renderEmail(tipo: Tipo, d: Record<string, any>) {
  const base = (title: string, body: string) => ({
    subject: title,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1a1a1a">
      <h2 style="border-bottom:2px solid #c9a55c;padding-bottom:10px;margin-top:0">${title}</h2>
      ${body}
      <p style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:12px">
        Notificação automática · VIP7 CRM
      </p>
    </div>`,
  });

  if (tipo === "lead_atribuido") {
    return base(
      `Novo lead atribuído: ${d.lead_nome ?? "—"}`,
      `<p>Você foi designado(a) como corretor responsável por um novo lead.</p>
       <ul style="line-height:1.7">
         <li><b>Nome:</b> ${d.lead_nome ?? "—"}</li>
         <li><b>Telefone:</b> ${d.lead_telefone ?? "—"}</li>
         <li><b>Origem:</b> ${d.origem ?? "—"}</li>
       </ul>
       <p><a href="${d.url ?? "#"}" style="display:inline-block;background:#c9a55c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Abrir lead</a></p>`
    );
  }
  if (tipo === "mudanca_etapa") {
    return base(
      `Lead mudou de etapa: ${d.lead_nome ?? "—"}`,
      `<p>O lead <b>${d.lead_nome ?? "—"}</b> avançou de <b>${d.from ?? "—"}</b> para <b>${d.to ?? "—"}</b>.</p>
       <p><a href="${d.url ?? "#"}" style="display:inline-block;background:#c9a55c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Ver lead</a></p>`
    );
  }
  return base(
    `Nova tarefa: ${d.titulo ?? "—"}`,
    `<p>Você recebeu uma nova tarefa.</p>
     <ul style="line-height:1.7">
       <li><b>Título:</b> ${d.titulo ?? "—"}</li>
       <li><b>Quando:</b> ${d.data_hora ?? "—"}</li>
       <li><b>Prioridade:</b> ${d.prioridade ?? "—"}</li>
     </ul>`
  );
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

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
      .select("email, nome, notif_email, ativo")
      .eq("id", body.recipientUserId).maybeSingle();

    if (!profile?.email || !profile.ativo || profile.notif_email === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "no email or opted out" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = renderEmail(body.tipo, body.data ?? {});

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "VIP7 CRM <onboarding@resend.dev>",
        to: [profile.email],
        subject,
        html,
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      console.error("Resend error", out);
      return new Response(JSON.stringify({ error: out }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: out.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
