// Helpers compartilhados das functions do Atendente IA WhatsApp.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
export const ZIONTALK_API_KEY = Deno.env.get("ZIONTALK_API_KEY") ?? "";

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function normalizarTelefone(tel: string | null | undefined): string {
  return (tel ?? "").replace(/\D/g, "").replace(/^55/, "");
}

export function formatPhoneE164BR(phoneBR: string): string {
  return `+55${phoneBR}`;
}

export async function comRetry<T>(
  fn: () => Promise<T>,
  max = 2,
  label = "op",
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = (e as Error)?.message ?? String(e);
      console.error(`[${label}] tentativa ${i + 1}/${max} falhou: ${msg}`);
      if (i < max - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

export async function enviarWhatsApp(phoneBR: string, msg: string): Promise<void> {
  if (!ZIONTALK_API_KEY) throw new Error("ZIONTALK_API_KEY missing");
  if (!phoneBR) throw new Error("phone vazio");
  await comRetry(
    async () => {
      const form = new FormData();
      form.append("msg", msg);
      form.append("mobile_phone", formatPhoneE164BR(phoneBR));
      const res = await fetch("https://app.ziontalk.com/api/send_message/", {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(`${ZIONTALK_API_KEY}:`)}` },
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`ZionTalk ${res.status}: ${txt.slice(0, 200)}`);
      }
      console.log(`[ziontalk-send] ok phone=${phoneBR} len=${msg.length}`);
    },
    2,
    "ziontalk-send",
  );
}

// ============ Lovable AI Gateway ============

export interface LovableMsg {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface LovableTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LovableOpts {
  model?: string;
  temperature?: number;
  tools?: LovableTool[];
  tool_choice?: "auto" | "none";
}

export interface LovableResponse {
  content: string | null;
  tool_calls: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  finish_reason: string;
}

export async function callLovableAI(
  messages: LovableMsg[],
  opts: LovableOpts = {},
): Promise<LovableResponse> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-3-flash-preview",
    messages,
  };
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (opts.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = opts.tool_choice ?? "auto";
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Lovable AI rate limited (429)");
  if (res.status === 402) throw new Error("Lovable AI sem créditos (402)");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Lovable AI ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  const msg = choice?.message ?? {};
  const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

  return {
    content: msg.content ?? null,
    finish_reason: choice?.finish_reason ?? "stop",
    tool_calls: toolCalls.map((tc: any) => {
      let args: Record<string, unknown> = {};
      try {
        args = tc?.function?.arguments
          ? JSON.parse(tc.function.arguments)
          : {};
      } catch {
        args = {};
      }
      return { id: tc.id, name: tc?.function?.name ?? "", arguments: args };
    }),
  };
}

// ============ Intent classification ============

export type Intent =
  | "busca_imovel"
  | "filtro"
  | "agendar_visita"
  | "falar_humano"
  | "outro";

export async function classificarIntencao(msg: string): Promise<Intent> {
  const prompt = `Classifique a intenção do cliente em EXATAMENTE uma destas categorias:
- busca_imovel (procurando um imóvel novo, perguntando sobre opções)
- filtro (refinando busca: bairro, preço, quartos, tipo)
- agendar_visita (quer ver pessoalmente, marcar visita, conhecer presencialmente)
- falar_humano (pediu corretor, atendente, humano)
- outro (qualquer outra coisa, saudações, dúvidas gerais)

Mensagem do cliente: """${msg}"""

Responda APENAS a palavra exata, sem ponto, sem explicação.`;

  const res = await callLovableAI(
    [{ role: "user", content: prompt }],
    { temperature: 0 },
  );
  const raw = (res.content ?? "").trim().toLowerCase().split(/\s+/)[0] ?? "";
  const valid: Intent[] = [
    "busca_imovel",
    "filtro",
    "agendar_visita",
    "falar_humano",
    "outro",
  ];
  return (valid as string[]).includes(raw) ? (raw as Intent) : "outro";
}

// ============ Property tools ============

export async function buscarImoveis(
  admin: SupabaseClient,
  filtros: {
    cidade?: string;
    bairro?: string;
    tipo?: string;
    preco_min?: number;
    preco_max?: number;
    quartos?: number;
    finalidade?: string;
  },
): Promise<Array<Record<string, unknown>>> {
  let q = admin
    .from("imoveis_proprios")
    .select(
      "codigo_imoview, titulo, tipo, finalidade, preco, cidade, bairro, quartos, suites, banheiros, vagas, area",
    )
    .eq("ativo", true)
    .in("status", ["disponivel", "sob_proposta"])
    .limit(5);

  if (filtros.cidade) q = q.ilike("cidade", `%${filtros.cidade}%`);
  if (filtros.bairro) q = q.ilike("bairro", `%${filtros.bairro}%`);
  if (filtros.tipo) q = q.ilike("tipo", `%${filtros.tipo}%`);
  if (filtros.finalidade) q = q.eq("finalidade", filtros.finalidade);
  if (typeof filtros.preco_min === "number") q = q.gte("preco", filtros.preco_min);
  if (typeof filtros.preco_max === "number") q = q.lte("preco", filtros.preco_max);
  if (typeof filtros.quartos === "number") q = q.gte("quartos", filtros.quartos);

  const { data, error } = await q;
  if (error) {
    console.error("[buscarImoveis] erro:", error.message);
    return [];
  }
  return (data ?? []).map((im: any) => ({
    ...im,
    link: im.codigo_imoview
      ? `https://vipsevenimoveis.com.br/imovel/${im.codigo_imoview}`
      : null,
  }));
}

export async function detalhesImovel(
  admin: SupabaseClient,
  codigo: number,
): Promise<Record<string, unknown> | null> {
  const { data } = await admin
    .from("imoveis_proprios")
    .select(
      "codigo_imoview, titulo, descricao, tipo, finalidade, preco, condominio, iptu, cidade, bairro, endereco, quartos, suites, banheiros, vagas, area, area_total, caracteristicas",
    )
    .eq("codigo_imoview", codigo)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    link: `https://vipsevenimoveis.com.br/imovel/${codigo}`,
  };
}

export const IA_TOOLS: LovableTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_imoveis",
      description:
        "Busca até 5 imóveis disponíveis na base por filtros. Use para sugerir opções quando o cliente descreve o que procura.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Cidade (ex: Sorocaba)" },
          bairro: { type: "string" },
          tipo: { type: "string", description: "apartamento, casa, terreno, comercial..." },
          finalidade: { type: "string", enum: ["venda", "aluguel"] },
          preco_min: { type: "number" },
          preco_max: { type: "number" },
          quartos: { type: "number", description: "Mínimo de quartos" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detalhes_imovel",
      description: "Retorna ficha completa de um imóvel pelo código (codigo_imoview).",
      parameters: {
        type: "object",
        properties: { codigo: { type: "number" } },
        required: ["codigo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pedir_handoff",
      description: "Sinaliza que a conversa deve ser transferida pro corretor humano (cliente quer agendar visita ou falar com pessoa).",
      parameters: {
        type: "object",
        properties: { motivo: { type: "string" } },
      },
    },
  },
];

export async function executarTool(
  admin: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === "buscar_imoveis") {
    return await buscarImoveis(admin, args as any);
  }
  if (name === "detalhes_imovel") {
    const codigo = Number(args.codigo);
    if (!Number.isFinite(codigo)) return { error: "codigo inválido" };
    return await detalhesImovel(admin, codigo);
  }
  if (name === "pedir_handoff") {
    return { handoff: true, motivo: String(args.motivo ?? "") };
  }
  return { error: `tool desconhecida: ${name}` };
}

export async function getAppConfig(
  admin: SupabaseClient,
  keys: string[],
): Promise<Record<string, string>> {
  const { data } = await admin
    .from("app_config")
    .select("key, value")
    .in("key", keys);
  return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
}
