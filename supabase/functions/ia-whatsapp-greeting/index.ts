// Edge function: dispara a 1ª mensagem WhatsApp via IA quando um lead novo entra.
// Chamada pelo trigger `disparar_ia_whatsapp` via pg_net.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  adminClient,
  callLovableAI,
  comRetry,
  corsHeaders,
  enviarWhatsApp,
  getAppConfig,
  json,
  normalizarTelefone,
} from "../_shared/ia.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    return json(200, { ok: true, service: "ia-whatsapp-greeting" });
  }

  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  let body: { lead_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  const leadId = (body.lead_id ?? "").trim();
  if (!leadId) return json(400, { error: "lead_id required" });

  const admin = adminClient();
  console.log(`[ia-greeting] start lead=${leadId}`);

  try {
    // 1) config
    const cfg = await getAppConfig(admin, [
      "ia_whatsapp_enabled",
      "ia_whatsapp_persona",
    ]);
    if (cfg.ia_whatsapp_enabled !== "true") {
      console.log("[ia-greeting] skip: IA desligada");
      return json(200, { skip: "disabled" });
    }
    const persona = cfg.ia_whatsapp_persona ?? "Você é assistente virtual.";

    // 2) carrega lead
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select(
        "id, nome, telefone, imovel_interesse_codigo, cidade_interesse, bairro_interesse, tipo_imovel, finalidade, ia_handoff",
      )
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr || !lead) {
      console.error("[ia-greeting] lead não encontrado", leadErr?.message);
      return json(404, { error: "lead not found" });
    }

    const phoneBR = normalizarTelefone(lead.telefone);
    if (phoneBR.length < 10) {
      console.log("[ia-greeting] skip: telefone inválido");
      return json(200, { skip: "no phone" });
    }
    if (lead.ia_handoff) {
      console.log("[ia-greeting] skip: já em handoff");
      return json(200, { skip: "handoff" });
    }

    // 3) idempotência — já mandou IA pra esse lead?
    const { data: existente } = await admin
      .from("ia_conversas")
      .select("id")
      .eq("lead_id", leadId)
      .eq("role", "assistant")
      .limit(1)
      .maybeSingle();
    if (existente) {
      console.log("[ia-greeting] skip: já enviado");
      return json(200, { skip: "already sent" });
    }

    // 4) busca imóvel de interesse
    let imovel: any = null;
    const codigo = Number(lead.imovel_interesse_codigo);
    if (Number.isFinite(codigo) && codigo > 0) {
      const { data } = await admin
        .from("imoveis_proprios")
        .select(
          "codigo_imoview, titulo, tipo, finalidade, preco, cidade, bairro, quartos, suites, banheiros, vagas, area",
        )
        .eq("codigo_imoview", codigo)
        .maybeSingle();
      imovel = data;
    }

    // 5) gera saudação
    const linkImovel = imovel?.codigo_imoview
      ? `https://vipsevenimoveis.com.br/imovel/${imovel.codigo_imoview}`
      : null;

    const ctx: string[] = [];
    if (imovel) {
      ctx.push(`Imóvel de interesse: ${imovel.titulo}`);
      if (imovel.bairro || imovel.cidade) {
        ctx.push(`Local: ${[imovel.bairro, imovel.cidade].filter(Boolean).join(", ")}`);
      }
      if (imovel.preco) {
        const finalidade = imovel.finalidade === "aluguel" ? "/mês" : "";
        ctx.push(
          `Preço: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(imovel.preco)}${finalidade}`,
        );
      }
      if (linkImovel) ctx.push(`Link: ${linkImovel}`);
    } else if (lead.cidade_interesse || lead.bairro_interesse || lead.tipo_imovel) {
      ctx.push(
        `Cliente busca: ${[lead.tipo_imovel, lead.finalidade, lead.bairro_interesse, lead.cidade_interesse].filter(Boolean).join(" / ")}`,
      );
    }

    const prompt = `${persona}

Cliente: ${lead.nome}
${ctx.join("\n")}

Escreva a 1ª mensagem WhatsApp pra esse cliente. Regras:
- Máximo 3 linhas curtas.
- Cumprimente pelo primeiro nome.
- Cite o imóvel/interesse (sem repetir o preço se já está no link).
${linkImovel ? `- Inclua o link: ${linkImovel}` : ""}
- Termine com uma pergunta aberta convidando a tirar dúvidas.
- Sem emojis exagerados (no máximo 1).
- Sem cabeçalho tipo "Olá," sozinho — emende.

Responda APENAS o texto da mensagem.`;

    const ai = await comRetry(
      () =>
        callLovableAI(
          [{ role: "user", content: prompt }],
          { temperature: 0.7 },
        ),
      2,
      "greeting-ai",
    );
    const mensagem = (ai.content ?? "").trim();
    if (!mensagem) {
      console.error("[ia-greeting] IA não respondeu");
      return json(500, { error: "ai empty" });
    }

    // 6) envia
    await enviarWhatsApp(phoneBR, mensagem);

    // 7) persiste
    const nowIso = new Date().toISOString();
    await admin.from("ia_conversas").insert([
      {
        lead_id: leadId,
        role: "system",
        content: `${persona}${imovel ? `\nImóvel atual: ${imovel.titulo} (cod ${imovel.codigo_imoview})` : ""}`,
        imovel_codigo: imovel?.codigo_imoview ?? null,
      },
      {
        lead_id: leadId,
        role: "assistant",
        content: mensagem,
        imovel_codigo: imovel?.codigo_imoview ?? null,
      },
    ]);

    await admin.from("lead_interacoes").insert({
      lead_id: leadId,
      tipo: "outro" as any,
      descricao: `[IA WhatsApp] ${mensagem}`,
      resultado: "enviado",
    });

    await admin
      .from("leads")
      .update({ ia_last_message_at: nowIso })
      .eq("id", leadId);

    console.log(`[ia-greeting] ok lead=${leadId} phone=${phoneBR}`);
    return json(200, { ok: true, mensagem });
  } catch (e: any) {
    console.error("[ia-greeting] error:", e?.message);
    return json(500, { error: e?.message ?? "internal error" });
  }
});
