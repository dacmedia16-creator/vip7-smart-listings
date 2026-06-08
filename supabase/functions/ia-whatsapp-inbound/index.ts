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

function waitUntil(promise: Promise<unknown>) {
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(promise);
    return;
  }
  promise.catch((e) => console.error("[ia-inbound] background error:", e?.message ?? e));
}

function extractPayload(p: any): {
  phone: string;
  message: string;
  tipo: string;
  evento: string;
} {
  // Formato ZionTalk (aninhado) + fallbacks de topo pra testes manuais.
  const phone =
    p?.contato?.telefone ??
    p?.contato?.phone ??
    p?.phone ??
    p?.mobile_phone ??
    p?.from ??
    p?.sender ??
    p?.number ??
    p?.telefone ??
    "";
  const message =
    p?.mensagem?.texto ??
    p?.mensagem?.text ??
    p?.message ??
    p?.msg ??
    p?.text ??
    p?.body ??
    p?.content ??
    "";
  const tipo = String(p?.mensagem?.tipo ?? p?.tipo ?? "text").toLowerCase();
  const evento = String(p?.evento ?? p?.event ?? "").toLowerCase();
  return {
    phone: String(phone ?? ""),
    message: String(message ?? ""),
    tipo,
    evento,
  };
}

async function processInbound(payload: any): Promise<void> {
  const { phone, message, tipo, evento } = extractPayload(payload);
  const phoneBR = normalizarTelefone(phone);
  const userMessage = (message ?? "").trim();

  if (evento && evento.includes("enviada")) {
    console.log(`[ia-inbound] skip evento=${evento}`);
    return;
  }

  if (tipo && !["text", "texto", "chat", ""].includes(tipo)) {
    console.log(`[ia-inbound] tipo não suportado: ${tipo}`);
    if (phoneBR) {
      await enviarWhatsApp(
        phoneBR,
        "Recebi seu envio! Por enquanto ainda não consigo ouvir áudios nem ver imagens por aqui — pode me escrever em texto o que está procurando? 🙏",
      ).catch((e) => console.warn("[ia-inbound] aviso tipo falhou:", e?.message));
    }
    return;
  }

  if (!phoneBR || !userMessage) {
    console.warn("[ia-inbound] payload inválido", { phone, hasMsg: !!message });
    return;
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
      return;
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
      return;
    }

    if (lead.ia_handoff) {
      console.log("[ia-inbound] skip: lead em handoff");
      return;
    }

    // 3) rate limit (5s) contra retries próximos da ZionTalk
    if (lead.ia_last_message_at) {
      const diffSecs =
        (Date.now() - new Date(lead.ia_last_message_at).getTime()) / 1000;
      if (diffSecs < 5) {
        console.log(`[rate-limit] skip ${diffSecs.toFixed(1)}s`);
        return;
      }
    }

    // 4) dedupe forte: mesma mensagem do cliente nos últimos 30s
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: duplicateUserMsg } = await admin
      .from("ia_conversas")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("role", "user")
      .eq("content", userMessage)
      .gte("created_at", thirtySecsAgo)
      .limit(1)
      .maybeSingle();
    if (duplicateUserMsg) {
      console.log("[ia-inbound] skip: mensagem duplicada recente");
      return;
    }

    const imovelCod = Number(lead.imovel_interesse_codigo);
    const imovelCodigo = imovelCod && Number.isFinite(imovelCod) ? imovelCod : null;

    // grava a mensagem do usuário antes de qualquer envio/IA para travar retries
    const { error: userInsertErr } = await admin.from("ia_conversas").insert({
      lead_id: lead.id,
      role: "user",
      content: userMessage,
      imovel_codigo: imovelCodigo,
    });
    if (userInsertErr) {
      console.warn("[ia-inbound] erro ao gravar user msg:", userInsertErr.message);
      return;
    }

    // atualiza last_message_at logo (lock soft contra concorrência)
    await admin
      .from("leads")
      .update({ ia_last_message_at: new Date().toISOString() })
      .eq("id", lead.id);

    // 5) Resposta imediata "aguarde" apenas após a trava anti-duplicidade
    await enviarWhatsApp(phoneBR, "⏳ Um momento, já volto com a resposta...").catch(
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
        imovel_codigo: imovelCodigo,
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

      return;
    }

    // 8) conversa normal — carrega histórico (filtrado por imóvel quando aplicável)
    let histQuery = admin
      .from("ia_conversas")
      .select("role, content")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .limit(20);

    if (imovelCodigo) {
      histQuery = histQuery.or(
        `imovel_codigo.eq.${imovelCodigo},imovel_codigo.is.null`,
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

    // 9) loop de tool calling (máx 3 iterações)
    let respostaFinal = "";
    let handoffViaTool = false;

    for (let i = 0; i < 3; i++) {
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
        if (!respostaFinal) {
          console.warn(`[gemini-tools] resposta vazia finish=${ai.finish_reason}`);
        }
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
        imovel_codigo: imovelCodigo,
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
      return;
    }

    if (!respostaFinal) {
      console.error("[ia-inbound] IA não gerou resposta final; não envia fallback genérico");
      return;
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
      imovel_codigo: imovelCodigo,
    });
    await admin
      .from("leads")
      .update({ ia_last_message_at: new Date().toISOString() })
      .eq("id", lead.id);

    console.log(`[ia-inbound] ok lead=${lead.id} phone=${phoneBR}`);
  } catch (e: any) {
    console.error("[ia-inbound] error:", e?.message);
  }
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

  // Log payload bruto (temporário, pra confirmar formato real do ZionTalk)
  try {
    console.log("[ia-inbound] payload:", JSON.stringify(payload).slice(0, 500));
  } catch {
    // ignore
  }

  waitUntil(processInbound(payload));
  return json(200, { ok: true, queued: true });
});
