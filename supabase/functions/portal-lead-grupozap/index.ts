// Webhook público para receber leads do Grupo OLX (Zap / VivaReal / OLX).
// Spec: https://developers.grupozap.com/webhooks/integration_leads.html
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPECTED_TOKEN = Deno.env.get("GRUPOZAP_LEAD_TOKEN") ?? "";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeDigits(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "");
}

interface GrupoZapLead {
  leadOrigin?: string;
  timestamp?: string;
  originLeadId?: string;
  originListingId?: string;
  clientListingId?: string;
  name?: string;
  email?: string;
  ddd?: string;
  phone?: string;
  phoneNumber?: string;
  message?: string;
  temperature?: string;
  transactionType?: "SELL" | "RENT" | string;
  extraData?: {
    leadCerto?: boolean;
    izi?: string;
    feedback?: string;
    leadType?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // GET → status check (admin UI usa pra saber se token está configurado)
  if (req.method === "GET") {
    return json(200, {
      ok: true,
      service: "portal-lead-grupozap",
      token_configured: EXPECTED_TOKEN.length > 0,
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  // Token (opcional enquanto não configurado)
  if (EXPECTED_TOKEN) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? req.headers.get("x-webhook-token") ?? "";
    if (token !== EXPECTED_TOKEN) {
      return json(401, { error: "invalid token" });
    }
  }

  let payload: GrupoZapLead;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  const name = (payload.name ?? "").trim();
  const phoneDigits = normalizeDigits(
    payload.phoneNumber || `${payload.ddd ?? ""}${payload.phone ?? ""}`,
  );
  const clientListingId = (payload.clientListingId ?? "").trim();

  if (!name || !phoneDigits || !clientListingId) {
    return json(400, {
      error: "missing required fields",
      required: ["name", "phone/phoneNumber or ddd+phone", "clientListingId"],
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const originLeadId = (payload.originLeadId ?? "").trim() || null;

  try {
    // 1. Idempotência por originLeadId
    if (originLeadId) {
      const { data: existing } = await admin
        .from("leads")
        .select("id")
        .eq("portal_origin", "grupo_olx")
        .eq("portal_origin_lead_id", originLeadId)
        .maybeSingle();
      if (existing?.id) {
        return json(200, { ok: true, deduped: true, lead_id: existing.id });
      }
    }

    // 2. Procura imóvel por clientListingId
    let imovelMatch: any = null;
    const asNumber = Number(clientListingId);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      const { data } = await admin
        .from("imoveis_proprios")
        .select("id, codigo_imoview, tipo, cidade, bairro, preco")
        .eq("codigo_imoview", asNumber)
        .limit(1)
        .maybeSingle();
      imovelMatch = data;
    }
    if (!imovelMatch) {
      const { data } = await admin
        .from("imoveis_proprios")
        .select("id, codigo_imoview, tipo, cidade, bairro, preco")
        .or(`codigo_interno.eq.${clientListingId},codigo_auxiliar.eq.${clientListingId}`)
        .limit(1)
        .maybeSingle();
      imovelMatch = data;
    }

    // 3. Mapeamentos
    const transactionType = payload.transactionType?.toUpperCase();
    const finalidade =
      transactionType === "RENT" ? "aluguel" : transactionType === "SELL" ? "venda" : null;

    const leadType = payload.extraData?.leadType ?? "";
    const temperature = payload.temperature ?? "";

    const tags = ["grupo-olx"];
    if (leadType) tags.push(leadType.toLowerCase());
    if (temperature) tags.push(temperature.toLowerCase());
    if (payload.extraData?.leadCerto) tags.push("lead-certo");

    const observacoes = [
      payload.message?.trim() ? `Mensagem: ${payload.message.trim()}` : null,
      temperature ? `Temperatura: ${temperature}` : null,
      leadType ? `Canal: ${leadType}` : null,
      originLeadId ? `originLeadId: ${originLeadId}` : null,
      payload.originListingId ? `originListingId: ${payload.originListingId}` : null,
      payload.extraData?.izi ? `IZI: ${payload.extraData.izi}` : null,
      payload.extraData?.feedback ? `Feedback: ${payload.extraData.feedback}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const origemUrl = payload.originListingId
      ? `https://www.zapimoveis.com.br/imovel/${payload.originListingId}/`
      : null;

    // 4. Deduplicação por telefone/email (30 dias)
    const { data: dupId } = await admin.rpc("find_duplicate_lead", {
      _telefone: phoneDigits,
      _email: payload.email ?? null,
    });

    if (dupId) {
      // Grava interação e marca portal_origin_lead_id no lead existente
      await admin.from("lead_interacoes").insert({
        lead_id: dupId as string,
        tipo: "outro" as any,
        descricao: `Novo contato via Grupo OLX (${leadType || "portal"})\n\n${observacoes}`,
      });
      if (originLeadId) {
        await admin
          .from("leads")
          .update({
            portal_origin: "grupo_olx",
            portal_origin_lead_id: originLeadId,
          })
          .eq("id", dupId as string)
          .is("portal_origin_lead_id", null);
      }
      return json(200, { ok: true, deduped: true, lead_id: dupId });
    }

    // 5. Insere novo lead
    const insertBody: Record<string, unknown> = {
      nome: name,
      email: payload.email ?? null,
      telefone: phoneDigits,
      origem: "portal" as any,
      origem_url: origemUrl,
      finalidade,
      status_funil: "novo" as any,
      observacoes,
      tags,
      imovel_interesse_codigo: clientListingId,
      portal_origin: "grupo_olx",
      portal_origin_lead_id: originLeadId,
    };

    if (imovelMatch) {
      insertBody.tipo_imovel = imovelMatch.tipo ?? null;
      insertBody.cidade_interesse = imovelMatch.cidade ?? null;
      insertBody.bairro_interesse = imovelMatch.bairro ?? null;
      if (imovelMatch.preco) insertBody.orcamento_max = imovelMatch.preco;
    }

    const { data: inserted, error: insErr } = await admin
      .from("leads")
      .insert(insertBody)
      .select("id")
      .single();

    if (insErr) {
      // Conflito no índice único = corrida com outro POST: tratamos como sucesso
      if ((insErr as any).code === "23505") {
        return json(200, { ok: true, deduped: true });
      }
      console.error("insert lead error", insErr);
      return json(500, { error: insErr.message });
    }

    return json(200, { ok: true, lead_id: inserted?.id });
  } catch (e: any) {
    console.error("portal-lead-grupozap error", e);
    return json(500, { error: e?.message ?? "internal error" });
  }
});
