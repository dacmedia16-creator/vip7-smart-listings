// Chat de busca por IA pública para o site (hero).
// Recebe { messages: [{role, content}] }, conversa em PT-BR e usa a tool
// buscar_imoveis contra a tabela imoveis_proprios. Retorna { reply, imoveis }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () => createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------------- Mapeamento imovel -> shape ImoviewProperty (front reutiliza PropertyCard) ----------------

interface Row {
  id: string;
  codigo_imoview: number | null;
  codigo_interno: string | null;
  titulo: string;
  descricao: string | null;
  finalidade: string;
  tipo: string;
  cidade: string | null;
  bairro: string | null;
  condominio_nome: string | null;
  endereco: string | null;
  preco: number;
  condominio: number | null;
  iptu: number | null;
  area: number | null;
  area_total: number | null;
  quartos: number | null;
  suites: number | null;
  vagas: number | null;
  banheiros: number | null;
  destaque: boolean;
  fotos: string[] | null;
  caracteristicas: string[] | null;
  aceita_permuta: boolean | null;
  valor_m2: number | null;
  data_atualizacao_origem: string | null;
  updated_at: string;
  created_at: string;
}

const SELECT_COLS =
  "id,codigo_imoview,codigo_interno,titulo,descricao,finalidade,tipo,cidade,bairro,endereco,condominio_nome," +
  "preco,condominio,iptu,area,area_total,quartos,suites,vagas,banheiros,destaque,fotos,caracteristicas," +
  "aceita_permuta,valor_m2,data_atualizacao_origem,created_at,updated_at";

function mapRow(r: Row) {
  const fin = r.finalidade === "aluguel" ? 1 : 2;
  return {
    codigo: r.codigo_imoview ?? 0,
    codigoReferencia: r.codigo_interno ?? undefined,
    titulo: r.titulo,
    descricao: r.descricao ?? undefined,
    finalidade: fin,
    tipo: r.tipo,
    tipoDescricao: r.tipo,
    cidade: r.cidade ?? undefined,
    bairro: r.bairro ?? undefined,
    condominio: r.condominio_nome ?? undefined,
    endereco: r.endereco ?? undefined,
    valor: r.preco,
    valorCondominio: r.condominio ?? undefined,
    valorIptu: r.iptu ?? undefined,
    areaTotal: r.area_total ?? undefined,
    areaConstruida: r.area ?? undefined,
    qtdeQuartos: r.quartos ?? undefined,
    qtdeSuites: r.suites ?? undefined,
    qtdeVagas: r.vagas ?? undefined,
    qtdeBanheiros: r.banheiros ?? undefined,
    destaque: r.destaque,
    fotos: (r.fotos ?? []).map((url) => ({ url })),
    caracteristicas: r.caracteristicas ?? [],
    aceitaPermuta: r.aceita_permuta ?? false,
    valorM2: r.valor_m2 ?? undefined,
    dataAtualizacao: r.data_atualizacao_origem ?? r.updated_at,
    dataCadastro: r.created_at,
  };
}

// ---------------- Tool: buscar_imoveis ----------------

interface FiltrosBusca {
  cidade?: string;
  bairro?: string;
  tipo?: string;
  finalidade?: "venda" | "aluguel";
  preco_min?: number;
  preco_max?: number;
  quartos_min?: number;
  vagas_min?: number;
  area_min?: number;
}

async function buscarImoveis(filtros: FiltrosBusca) {
  let q = admin()
    .from("imoveis_proprios")
    .select(SELECT_COLS)
    .eq("ativo", true)
    .in("status", ["disponivel", "sob_proposta"])
    .order("destaque", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(6);

  if (filtros.cidade) q = q.ilike("cidade", `%${filtros.cidade}%`);
  if (filtros.bairro) q = q.ilike("bairro", `%${filtros.bairro}%`);
  if (filtros.tipo) q = q.ilike("tipo", `%${filtros.tipo}%`);
  if (filtros.finalidade) {
    const opts = filtros.finalidade === "aluguel"
      ? ["aluguel", "venda_aluguel"]
      : ["venda", "venda_aluguel"];
    q = q.in("finalidade", opts);
  }
  if (typeof filtros.preco_min === "number") q = q.gte("preco", filtros.preco_min);
  if (typeof filtros.preco_max === "number") q = q.lte("preco", filtros.preco_max);
  if (typeof filtros.quartos_min === "number") q = q.gte("quartos", filtros.quartos_min);
  if (typeof filtros.vagas_min === "number") q = q.gte("vagas", filtros.vagas_min);
  if (typeof filtros.area_min === "number") q = q.gte("area", filtros.area_min);

  const { data, error } = await q;
  if (error) {
    console.error("[buscar_imoveis] erro:", error.message);
    return { erro: error.message, imoveis: [] };
  }
  return { imoveis: (data ?? []).map((r) => mapRow(r as unknown as Row)) };
}

// ---------------- Lovable AI ----------------

interface ChatMsg {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "buscar_imoveis",
      description:
        "Busca imóveis disponíveis na base da VIP Seven por filtros estruturados. Use SEMPRE que o cliente descrever o que procura (cidade, bairro, tipo, preço, quartos). Retorna até 6 imóveis ordenados por relevância. Use os campos mais específicos disponíveis.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Cidade. Ex: Sorocaba, Votorantim." },
          bairro: { type: "string", description: "Bairro. Ex: Campolim, Jardim Vergueiro." },
          tipo: {
            type: "string",
            description:
              "Tipo do imóvel: apartamento, casa, casa em condomínio, terreno, comercial, cobertura.",
          },
          finalidade: { type: "string", enum: ["venda", "aluguel"] },
          preco_min: { type: "number", description: "Preço mínimo em reais (BRL)." },
          preco_max: { type: "number", description: "Preço máximo em reais (BRL)." },
          quartos_min: { type: "number", description: "Mínimo de quartos." },
          vagas_min: { type: "number", description: "Mínimo de vagas de garagem." },
          area_min: { type: "number", description: "Área mínima construída em m²." },
        },
      },
    },
  },
];

const SYSTEM_PROMPT = `Você é o assistente virtual da VIP Seven Imóveis, imobiliária de alto padrão em Sorocaba e Votorantim.

Sua função: ajudar o visitante a encontrar imóveis reais do nosso catálogo conversando em português, de forma consultiva, curta e gentil.

REGRAS:
- SEMPRE que o cliente descrever o que procura, chame a tool buscar_imoveis com os filtros que conseguir extrair da mensagem. Não invente imóveis.
- Se faltar informação crucial (ex: cidade), faça UMA pergunta objetiva antes de buscar — mas se já houver pelo menos cidade OU bairro OU tipo, busque direto.
- Ao receber resultados da tool: faça um comentário CURTO (1-3 linhas) sobre o que encontrou. NÃO liste os imóveis em texto — eles aparecem como cards visuais para o cliente. Apenas comente quantos achou e convide a refinar.
- Se a tool retornar zero imóveis, diga que não encontramos com esses filtros e sugira flexibilizar (ex: ampliar faixa de preço, considerar bairros próximos).
- Quando o cliente refinar ("mais barato", "só com piscina", "outro bairro"), entenda o contexto da conversa e chame a tool novamente com filtros atualizados.
- Formate preços como R$ 850.000 ou R$ 1,2 milhão.
- Fale como um corretor humano experiente, nunca robotizado. No máximo 4 linhas por resposta.
- Nunca peça dados pessoais (nome, telefone, e-mail).`;

async function callAI(messages: ChatMsg[]) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });
  if (res.status === 429) throw new Error("Lovable AI rate limited (429)");
  if (res.status === 402) throw new Error("Sem créditos (402)");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Lovable AI ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  return {
    content: (msg.content ?? null) as string | null,
    tool_calls: (msg.tool_calls ?? []) as ChatMsg["tool_calls"],
    finish_reason: data?.choices?.[0]?.finish_reason ?? "stop",
  };
}

// ---------------- Handler ----------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY missing" });

  let body: { messages?: Array<{ role: string; content: string }> } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "json invalido" });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (!incoming.length) return json(400, { error: "messages vazio" });

  // Normaliza e limita histórico (últimas 12 mensagens) para controlar custo
  const hist: ChatMsg[] = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...hist];

  let imoveisColetados: unknown[] = [];
  let reply = "";

  try {
    // Loop de tool calling (máx 3 iterações)
    for (let i = 0; i < 3; i++) {
      const ai = await callAI(messages);

      if (ai.tool_calls && ai.tool_calls.length > 0) {
        // Adiciona a mensagem do assistant com as tool calls
        messages.push({
          role: "assistant",
          content: ai.content,
          tool_calls: ai.tool_calls,
        });

        for (const tc of ai.tool_calls) {
          let args: FiltrosBusca = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
            args = {};
          }
          console.log("[tool] buscar_imoveis args=", JSON.stringify(args));
          const result = await buscarImoveis(args);
          if (Array.isArray(result.imoveis)) {
            imoveisColetados = result.imoveis; // mantém o último resultado
          }
          // Devolve um resumo enxuto para o modelo (sem fotos/descrição longa)
          const resumo = {
            total: result.imoveis?.length ?? 0,
            imoveis: (result.imoveis ?? []).map((im) => ({
              codigo: im.codigo,
              titulo: im.titulo,
              tipo: im.tipo,
              finalidade: im.finalidade === 1 ? "aluguel" : "venda",
              bairro: im.bairro,
              cidade: im.cidade,
              preco: im.valor,
              quartos: im.qtdeQuartos,
              vagas: im.qtdeVagas,
              area: im.areaConstruida ?? im.areaTotal,
            })),
          };
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify(resumo),
          });
        }
        continue;
      }

      reply = ai.content ?? "";
      break;
    }

    if (!reply) reply = "Posso te ajudar a refinar a busca?";

    return json(200, { reply, imoveis: imoveisColetados });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[busca-ia-site] erro:", msg);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return json(status, { error: msg });
  }
});
