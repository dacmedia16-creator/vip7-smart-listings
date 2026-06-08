// Edge function: recebe mensagens do cliente via webhook ZionTalk
// e mantém conversa contínua com IA (com tools para consultar imóveis).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  adminClient,
  callLovableAI,
  classificarIntencao,
  comRetry,
  corsHeaders,
  enviarWhatsApp,
  executarTool,
  getAppConfig,
  IA_TOOLS,
  json,
  type LovableMsg,
  normalizarTelefone,
} from "../_shared/ia.ts";

const ZIONTALK_INBOUND_TOKEN = Deno.env.get("ZIONTALK_INBOUND_TOKEN") ?? "";

function extractPayload(p: any): { phone: string; message: string } {
  // ZionTalk não publica spec do webhook; tentamos vários nomes comuns.
  const phone =
    p?.phone ?? p?.mobile_phone ?? p?.from ?? p?.sender ?? p?.number ?? p?.telefone ?? "";
  const message =
    p?.message ?? p?.msg ?? p?.text ?? p?.body ?? p?.content ?? "";
  return { phone: String(phone ?? ""), message: String(message ?? "") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // GET → status check (UI usa pra mostrar badge "Protegido por token")
  if (req.method === "GET") {
    return json(200, {
      ok: true,
      service: "ia-whatsapp-inbound",
      token_configured: ZIONTALK_INBOUND_TOKEN.length > 0,
    });
  }

  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  // Auth Bearer (opcional enquanto não tem token)
  if (ZIONTALK_INBOUND_TOKEN) {
    const auth = req.headers.get("authorization") ?? "";
    const xtoken = req.headers.get("x-webhook-token") ?? "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const token = bearer || xtoken;
    if (token !== ZIONTALK_INBOUND_TOKEN) {
      console.warn("[ia-inbound] token inválido");
      return json(401, { error: "unauthorized" });
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  const { phone, message } = extractPayload(payload);
  const phoneBR = normalizarTelefone(phone);
  const userMessage = (message ?? "").trim();

  if (!phoneBR || !userMessage) {
    console.warn("[ia-inbound] payload inválido", { phone, hasMsg: !!message });
    return json(400, { error: "missing phone or message" });
  }

  console.log(`[ia-inbound] phone=${phoneBR} msg="${userMessage.slice(0, 80)}"`);
  const admin = adminClient();

  try {
    // 1) config
    const cfg = await getAppConfig(admin, [
      "ia_whatsapp_enabled",
      "ia_whatsapp_persona",
      "ia_whatsapp_handoff_keywords",
      "ia_whatsapp_truncate_chars",
    ]);
    if (cfg.ia_whatsapp_enabled !== "true") {
      console.log("[ia-inbound] skip: IA desligada");
      return json(200, { skip: "disabled" });
    }
    const persona = cfg.ia_whatsapp_persona ?? "Você é assistente virtual.";
    const truncate = parseInt(cfg.ia_whatsapp_truncate_chars ?? "600", 10) || 600;
    const handoffKeywords = (cfg.ia_whatsapp_handoff_keywords ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // 2) acha lead pelo telefone (últimos 90 dias)
    const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: leads } = await admin
      .from("leads")
      .select(
        "id, nome, telefone, corretor_id, ia_handoff, ia_last_message_at, imovel_interesse_codigo",
      )
      .like("telefone", `%${phoneBR}%`)
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(1);
    const lead = leads?.[0];

    if (!lead) {
      console.log("[ia-inbound] lead não encontrado");
      return json(200, { skip: "no lead" });
    }

    if (lead.ia_handoff) {
      console.log("[ia-inbound] skip: lead em handoff");
      return json(200, { skip: "handoff" });
    }

    // 3) rate limit (2s)
    if (lead.ia_last_message_at) {
      const diffSecs =
        (Date.now() - new Date(lead.ia_last_message_at).getTime()) / 1000;
      if (diffSecs < 2) {
        console.log(`[rate-limit] skip ${diffSecs.toFixed(1)}s`);
        return json(200, { skip: "rate-limited" });
      }
    }

    // 4) atualiza last_message_at logo (lock soft contra concorrência)
    await admin
      .from("leads")
      .update({ ia_last_message_at: new Date().toISOString() })
      .eq("id", lead.id);

    // 5) Resposta imediata "aguarde" (fire-and-forget, não bloqueia)
    enviarWhatsApp(phoneBR, "⏳ Um momento, já volto com a resposta...").catch(
      (e) => console.warn("[ia-inbound] aguarde send falhou:", e?.message),
    );

    // 6) fallback rápido por keyword
    const userLower = userMessage.toLowerCase();
    const matchedKeyword = handoffKeywords.find((k) => userLower.includes(k));

    let intent = "outro";
    if (matchedKeyword) {
      intent = matchedKeyword.includes("visita") ? "agendar_visita" : "falar_humano";
      console.log(`[intent] keyword="${matchedKeyword}" → ${intent}`);
    } else {
      try {
        intent = await comRetry(
          () => classificarIntencao(userMessage),
          2,
          "intent",
        );
        console.log(`[intent] ${intent}`);
      } catch (e) {
        console.warn("[intent] falhou, seguindo como 'outro':", (e as Error).message);
      }
    }

    // grava mensagem do usuário no histórico
    await admin.from("ia_conversas").insert({
      lead_id: lead.id,
      role: "user",
      content: userMessage,
      imovel_codigo: lead.imovel_interesse_codigo
        ? Number(lead.imovel_interesse_codigo) || null
        : null,
    });

    // 7) handoff
    if (intent === "agendar_visita" || intent === "falar_humano") {
      console.log(`[handoff] motivo=${intent}`);
      const motivo =
        intent === "agendar_visita"
          ? "Cliente quer agendar visita"
          : "Cliente pediu atendimento humano";
      await admin
        .from("leads")
        .update({
          ia_handoff: true,
          ia_handoff_at: new Date().toISOString(),
          ia_handoff_motivo: motivo,
        })
        .eq("id", lead.id);

      const respHandoff =
        "Perfeito! Já vou chamar nosso corretor pra continuar com você aqui mesmo. Um instante 🤝";
      await enviarWhatsApp(phoneBR, respHandoff);

      await admin.from("ia_conversas").insert({
        lead_id: lead.id,
        role: "assistant",
        content: respHandoff,
        imovel_codigo: lead.imovel_interesse_codigo
          ? Number(lead.imovel_interesse_codigo) || null
          : null,
      });

      // cria tarefa pro corretor
      if (lead.corretor_id) {
        await admin
          .from("tarefas")
          .insert({
            titulo: `Seguir conversa WhatsApp — ${lead.nome}`,
            descricao: `${motivo}\n\nÚltima mensagem do cliente:\n"${userMessage}"`,
            tipo: "outro" as any,
            prioridade: "alta" as any,
            status: "pendente" as any,
            data_hora: new Date().toISOString(),
            responsavel_id: lead.corretor_id,
            lead_id: lead.id,
          })
          .then(({ error }) => {
            if (error) console.warn("[handoff] erro ao criar tarefa:", error.message);
          });
      }

      return json(200, { handoff: true });
    }

    // 8) conversa normal — carrega histórico (filtrado por imóvel quando aplicável)
    let histQuery = admin
      .from("ia_conversas")
      .select("role, content")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const imovelCod = Number(lead.imovel_interesse_codigo);
    if (Number.isFinite(imovelCod) && imovelCod > 0) {
      histQuery = histQuery.or(
        `imovel_codigo.eq.${imovelCod},imovel_codigo.is.null`,
      );
    }
    const { data: historico } = await histQuery;

    const messages: LovableMsg[] = [
      { role: "system", content: persona },
      ...(historico ?? []).map((h: any) => ({
        role: h.role as "user" | "assistant" | "system",
        content: h.content,
      })),
    ];

    // 9) loop de tool calling (máx 5 iterações)
    let respostaFinal = "";
    let handoffViaTool = false;

    for (let i = 0; i < 5; i++) {
      const ai = await comRetry(
        () =>
          callLovableAI(messages, {
            tools: IA_TOOLS,
            temperature: 0.4,
          }),
        2,
        "gemini-tools",
      );

      // sem tool calls — resposta final
      if (!ai.tool_calls.length) {
        respostaFinal = (ai.content ?? "").trim();
        break;
      }

      // adiciona assistant com tool_calls ao histórico do loop
      messages.push({
        role: "assistant",
        content: ai.content ?? "",
        tool_calls: ai.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      });

      // executa cada tool e devolve resultado
      for (const tc of ai.tool_calls) {
        console.log(`[gemini-tools] tool=${tc.name} args=${JSON.stringify(tc.arguments)}`);
        if (tc.name === "pedir_handoff") {
          handoffViaTool = true;
        }
        const result = await executarTool(admin, tc.name, tc.arguments);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(result).slice(0, 4000),
        });
      }

      if (handoffViaTool) break;
    }

    // se IA pediu handoff via tool
    if (handoffViaTool) {
      console.log("[handoff] via tool");
      await admin
        .from("leads")
        .update({
          ia_handoff: true,
          ia_handoff_at: new Date().toISOString(),
          ia_handoff_motivo: "IA solicitou transferência",
        })
        .eq("id", lead.id);

      const respHand =
        "Vou pedir pro nosso corretor te chamar aqui mesmo, ok? Em instantes alguém te responde 🤝";
      await enviarWhatsApp(phoneBR, respHand);
      await admin.from("ia_conversas").insert({
        lead_id: lead.id,
        role: "assistant",
        content: respHand,
        imovel_codigo: imovelCod && Number.isFinite(imovelCod) ? imovelCod : null,
      });
      if (lead.corretor_id) {
        await admin.from("tarefas").insert({
          titulo: `Seguir conversa WhatsApp — ${lead.nome}`,
          descricao: `IA pediu transferência.\n\nÚltima mensagem:\n"${userMessage}"`,
          tipo: "outro" as any,
          prioridade: "alta" as any,
          status: "pendente" as any,
          data_hora: new Date().toISOString(),
          responsavel_id: lead.corretor_id,
          lead_id: lead.id,
        });
      }
      return json(200, { handoff: true, via: "tool" });
    }

    if (!respostaFinal) {
      respostaFinal =
        "Desculpa, tive um problema agora. Pode me mandar de novo, por favor?";
    }
    if (respostaFinal.length > truncate) {
      respostaFinal = respostaFinal.slice(0, truncate).trim() + "...";
    }

    // 10) envia resposta final e grava
    await enviarWhatsApp(phoneBR, respostaFinal);

    await admin.from("ia_conversas").insert({
      lead_id: lead.id,
      role: "assistant",
      content: respostaFinal,
      imovel_codigo: imovelCod && Number.isFinite(imovelCod) ? imovelCod : null,
    });
    await admin
      .from("leads")
      .update({ ia_last_message_at: new Date().toISOString() })
      .eq("id", lead.id);

    return json(200, { ok: true, resposta: respostaFinal });
  } catch (e: any) {
    console.error("[ia-inbound] error:", e?.message);
    return json(500, { error: e?.message ?? "internal error" });
  }
});
