// Cron-triggered notifications worker.
// Authorization: requires Bearer <SUPABASE_SERVICE_ROLE_KEY> (called by pg_cron).
// Modes:
//   POST /                       → process task reminders (1d, 2h, 30min)
//   POST /?mode=digest           → daily 8h digest to managers
//   POST /?mode=stale-leads      → WhatsApp alert for leads sem contato +3 dias

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ZIONTALK_API_KEY = Deno.env.get("ZIONTALK_API_KEY");
const CRM_BASE_URL = Deno.env.get("CRM_BASE_URL") ?? "https://vipsevenimoveis.com.br";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function toE164(phone: string): string | null {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55")) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return `+${d}`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { skipped: "no resend key" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: "VIP7 CRM <onboarding@resend.dev>", to: [to], subject, html }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) console.error("Resend error", r.status, out);
  return { ok: r.ok, out };
}

async function sendWhatsApp(phone: string, msg: string) {
  if (!ZIONTALK_API_KEY) return { skipped: "no ziontalk key" };
  const e164 = toE164(phone);
  if (!e164) return { skipped: "invalid phone" };
  const form = new FormData();
  form.append("msg", msg);
  form.append("mobile_phone", e164);
  const basic = btoa(`${ZIONTALK_API_KEY}:`);
  const r = await fetch("https://app.ziontalk.com/api/send_message/", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    body: form,
  });
  const text = await r.text();
  if (!r.ok) console.error("ZionTalk error", r.status, text);
  return { ok: r.ok };
}

function htmlShell(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:20px;color:#1a1a1a">
    <h2 style="border-bottom:2px solid #c9a55c;padding-bottom:10px;margin-top:0">${title}</h2>
    ${body}
    <p style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:12px">
      Notificação automática · VIP7 CRM
    </p>
  </div>`;
}

function fmtDateBR(d: Date) {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type Profile = { id: string; nome: string; email: string; telefone: string | null; notif_email: boolean; notif_whatsapp: boolean; ativo: boolean };

async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await admin.from("profiles")
    .select("id, nome, email, telefone, notif_email, notif_whatsapp, ativo")
    .eq("id", id).maybeSingle();
  return (data as any) ?? null;
}

// ---------- Mode: reminders ----------
async function processReminders() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in1d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1dEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: tarefas } = await admin.from("tarefas")
    .select("id, titulo, tipo, prioridade, data_hora, responsavel_id, lead_id, lembrete_1d_em, lembrete_2h_em, lembrete_30min_em")
    .eq("status", "pendente")
    .lte("data_hora", in1dEnd.toISOString())
    .gte("data_hora", now.toISOString());

  let sent = { wa30: 0, em2h: 0, em1d: 0 };
  for (const t of tarefas ?? []) {
    const due = new Date(t.data_hora);
    const profile = await getProfile(t.responsavel_id);
    if (!profile || !profile.ativo) continue;
    const link = t.lead_id ? `${CRM_BASE_URL}/crm/leads/${t.lead_id}` : `${CRM_BASE_URL}/crm/tarefas`;

    // 30 min WhatsApp
    if (!t.lembrete_30min_em && due <= in30 && profile.notif_whatsapp && profile.telefone) {
      const msg = `⏰ *Tarefa em 30 minutos*\n\n*${t.titulo}*\nHoje às ${fmtDateBR(due)}\nPrioridade: ${t.prioridade}\n\n${link}`;
      const r = await sendWhatsApp(profile.telefone, msg);
      if (r.ok) {
        await admin.from("tarefas").update({ lembrete_30min_em: now.toISOString() } as any).eq("id", t.id);
        sent.wa30++;
      }
    }
    // 2h email
    if (!t.lembrete_2h_em && due <= in2h && profile.notif_email && profile.email) {
      const html = htmlShell("Tarefa em 2 horas",
        `<p>Olá ${profile.nome}, sua tarefa está chegando:</p>
         <ul style="line-height:1.7">
           <li><b>Título:</b> ${t.titulo}</li>
           <li><b>Quando:</b> ${fmtDateBR(due)}</li>
           <li><b>Prioridade:</b> ${t.prioridade}</li>
         </ul>
         <p><a href="${link}" style="display:inline-block;background:#c9a55c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Abrir no CRM</a></p>`);
      const r = await sendEmail(profile.email, `⏰ Em 2h: ${t.titulo}`, html);
      if (r.ok) {
        await admin.from("tarefas").update({ lembrete_2h_em: now.toISOString() } as any).eq("id", t.id);
        sent.em2h++;
      }
    }
    // 1d email
    if (!t.lembrete_1d_em && due <= in1d && profile.notif_email && profile.email) {
      const html = htmlShell("Tarefa amanhã",
        `<p>Olá ${profile.nome}, lembrete da tarefa programada para amanhã:</p>
         <ul style="line-height:1.7">
           <li><b>Título:</b> ${t.titulo}</li>
           <li><b>Quando:</b> ${fmtDateBR(due)}</li>
           <li><b>Prioridade:</b> ${t.prioridade}</li>
         </ul>
         <p><a href="${link}" style="display:inline-block;background:#c9a55c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Abrir no CRM</a></p>`);
      const r = await sendEmail(profile.email, `📅 Amanhã: ${t.titulo}`, html);
      if (r.ok) {
        await admin.from("tarefas").update({ lembrete_1d_em: now.toISOString() } as any).eq("id", t.id);
        sent.em1d++;
      }
    }
  }
  return { processed: tarefas?.length ?? 0, sent };
}

// ---------- Mode: daily digest ----------
async function sendDailyDigest() {
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const seteDias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tresDias = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const ontem = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Recipients: admins + gestores
  const { data: managerRows } = await admin.from("user_roles")
    .select("user_id, role").in("role", ["admin", "gestor"]);
  const managerIds = Array.from(new Set((managerRows ?? []).map((r: any) => r.user_id)));

  const [tarefasHoje, tarefasAtrasadas, novosLeads, leadsAtrasados] = await Promise.all([
    admin.from("tarefas").select("id, titulo, data_hora, responsavel_id, prioridade")
      .eq("status", "pendente").gte("data_hora", startToday.toISOString()).lte("data_hora", endToday.toISOString())
      .order("data_hora", { ascending: true }).limit(15),
    admin.from("tarefas").select("id, titulo, data_hora, responsavel_id")
      .eq("status", "pendente").lt("data_hora", startToday.toISOString())
      .order("data_hora", { ascending: false }).limit(15),
    admin.from("leads").select("id, nome, telefone, origem, created_at")
      .gte("created_at", ontem.toISOString())
      .order("created_at", { ascending: false }).limit(15),
    admin.from("leads").select("id, nome, telefone, status_funil, last_contact_at, created_at")
      .not("status_funil", "in", "(fechamento,perdido)")
      .or(`last_contact_at.lt.${tresDias.toISOString()},and(last_contact_at.is.null,created_at.lt.${tresDias.toISOString()})`)
      .limit(20),
  ]);

  const li = (s: string) => `<li style="margin:4px 0">${s}</li>`;
  const list = (rows: string[]) => rows.length ? `<ul style="line-height:1.6;padding-left:18px">${rows.join("")}</ul>` : `<p style="color:#888;margin:4px 0">—</p>`;

  const tarefasHojeHtml = list((tarefasHoje.data ?? []).map((t: any) =>
    li(`<b>${fmtDateBR(new Date(t.data_hora))}</b> · ${t.titulo} <span style="color:#888">(${t.prioridade})</span>`)));
  const tarefasAtrasadasHtml = list((tarefasAtrasadas.data ?? []).map((t: any) =>
    li(`<span style="color:#dc2626;font-weight:600">Atrasada</span> · ${t.titulo} <span style="color:#888">(${fmtDateBR(new Date(t.data_hora))})</span>`)));
  const novosLeadsHtml = list((novosLeads.data ?? []).map((l: any) =>
    li(`<b>${l.nome}</b> · ${l.telefone ?? "—"} <span style="color:#888">(${l.origem})</span>`)));
  const leadsAtrasadosHtml = list((leadsAtrasados.data ?? []).map((l: any) => {
    const ref = l.last_contact_at ? new Date(l.last_contact_at) : new Date(l.created_at);
    const dias = Math.floor((now.getTime() - ref.getTime()) / (24 * 60 * 60 * 1000));
    return li(`<b>${l.nome}</b> · ${l.telefone ?? "—"} <span style="color:#dc2626">${dias}d sem contato</span>`);
  }));

  const body = `
    <p>Bom dia! Resumo do CRM:</p>
    <h3 style="color:#c9a55c;margin-top:24px">📋 Tarefas de hoje (${(tarefasHoje.data ?? []).length})</h3>
    ${tarefasHojeHtml}
    <h3 style="color:#dc2626;margin-top:24px">⚠️ Tarefas atrasadas (${(tarefasAtrasadas.data ?? []).length})</h3>
    ${tarefasAtrasadasHtml}
    <h3 style="color:#2563eb;margin-top:24px">🆕 Novos leads (24h) (${(novosLeads.data ?? []).length})</h3>
    ${novosLeadsHtml}
    <h3 style="color:#d97706;margin-top:24px">⏰ Leads sem contato +3 dias (${(leadsAtrasados.data ?? []).length})</h3>
    ${leadsAtrasadosHtml}
    <p style="margin-top:24px"><a href="${CRM_BASE_URL}/crm" style="display:inline-block;background:#c9a55c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Abrir CRM</a></p>`;

  const html = htmlShell(`Resumo diário · ${fmtDateBR(now).split(" ")[0]}`, body);

  let sent = 0;
  for (const mid of managerIds) {
    const p = await getProfile(mid);
    if (!p || !p.ativo || !p.email || p.notif_email === false) continue;
    const r = await sendEmail(p.email, `📊 Resumo diário VIP7 CRM`, html);
    if (r.ok) sent++;
  }
  return { managers: managerIds.length, sent };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecretHeader = req.headers.get("x-cron-secret") ?? "";

  let authorized = authHeader === `Bearer ${SERVICE_ROLE}`;
  if (!authorized && cronSecretHeader) {
    const { data } = await admin.from("app_config" as any)
      .select("value").eq("key", "cron_secret").maybeSingle();
    const expected = (data as any)?.value ?? Deno.env.get("CRON_SECRET") ?? "";
    if (expected && cronSecretHeader === expected) authorized = true;
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "reminders";

    let result: any;
    if (mode === "digest") result = await sendDailyDigest();
    else result = await processReminders();

    return new Response(JSON.stringify({ ok: true, mode, ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("cron-notifications error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
