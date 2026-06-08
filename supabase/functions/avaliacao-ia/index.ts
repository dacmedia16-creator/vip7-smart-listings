import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RequestBody {
  tipoImovel: string;
  finalidade: string;
  cidade: string;
  bairro: string;
  cep?: string;
  areaTotal?: string;
  areaConstruida?: string;
  quartos?: string;
  banheiros?: string;
  vagas?: string;
  descricao?: string;
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val.replace(",", ".")) || 0;
  return 0;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Maps user finalidade input to DB finalidade values
function finalidadeFilter(f: string): string[] {
  if (f === "alugar") return ["aluguel", "venda_aluguel"];
  if (f === "vender") return ["venda", "venda_aluguel"];
  return ["venda", "aluguel", "venda_aluguel"];
}

// Maps user tipoImovel input to DB tipo patterns
function tipoLikePatterns(t: string): string[] {
  const map: Record<string, string[]> = {
    apartamento: ["apartamento", "flat", "cobertura", "garden", "studio", "duplex"],
    casa: ["casa"],
    casa_condominio: ["casa de condominio", "casa em condominio"],
    terreno: ["terreno", "lote"],
    comercial: ["sala", "comercial", "predio", "prédio", "galpao", "galpão"],
    rural: ["rural", "chacara", "chácara", "sitio", "sítio", "fazenda"],
  };
  return map[t] || [];
}

interface Comparavel {
  tipo: string;
  cidade: string;
  bairro: string;
  valor: number;
  areaTotal: number;
  areaConstruida: number;
  quartos: number;
  banheiros: number;
  vagas: number;
  valorM2: number;
  finalidade: string;
}

async function fetchComparaveisLocal(body: RequestBody): Promise<Comparavel[]> {
  const finalidades = finalidadeFilter(body.finalidade);
  const tipoPats = tipoLikePatterns(body.tipoImovel);

  let q = supabase
    .from("imoveis_proprios")
    .select(
      "tipo,cidade,bairro,preco,area,area_total,quartos,banheiros,vagas,valor_m2,finalidade",
    )
    .eq("ativo", true)
    .in("status", ["disponivel", "sob_proposta"])
    .in("finalidade", finalidades)
    .gt("preco", 0)
    .limit(300);

  if (body.cidade) q = q.ilike("cidade", `%${body.cidade}%`);
  if (tipoPats.length > 0) {
    const or = tipoPats.map((p) => `tipo.ilike.%${p}%`).join(",");
    q = q.or(or);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[avaliacao-ia] DB error:", error);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    tipo: String(r.tipo ?? ""),
    cidade: String(r.cidade ?? ""),
    bairro: String(r.bairro ?? ""),
    valor: Number(r.preco ?? 0),
    areaTotal: Number(r.area_total ?? 0),
    areaConstruida: Number(r.area ?? 0),
    quartos: Number(r.quartos ?? 0),
    banheiros: Number(r.banheiros ?? 0),
    vagas: Number(r.vagas ?? 0),
    valorM2: Number(r.valor_m2 ?? 0),
    finalidade: String(r.finalidade ?? ""),
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const body: RequestBody = await req.json();
    console.log("[avaliacao-ia] Request:", JSON.stringify(body));

    const userQuartos = body.quartos ? parseNum(body.quartos) : null;
    const userVagas = body.vagas ? parseNum(body.vagas) : null;
    const userBanheiros = body.banheiros ? parseNum(body.banheiros) : null;
    const userArea = body.areaConstruida
      ? parseNum(body.areaConstruida)
      : body.areaTotal ? parseNum(body.areaTotal) : null;

    const comparaveis = await fetchComparaveisLocal(body);
    console.log(`[avaliacao-ia] Got ${comparaveis.length} candidates from local DB`);

    // Apply optional filters with tolerance
    const applyOptional = (list: Comparavel[]) =>
      list.filter((p) => {
        if (userQuartos !== null && userQuartos > 0 && p.quartos > 0 && Math.abs(p.quartos - userQuartos) > 1) return false;
        if (userVagas !== null && userVagas > 0 && p.vagas > 0 && Math.abs(p.vagas - userVagas) > 1) return false;
        if (userBanheiros !== null && userBanheiros > 0 && p.banheiros > 0 && Math.abs(p.banheiros - userBanheiros) > 1) return false;
        if (userArea !== null && userArea > 0) {
          const pArea = p.areaConstruida || p.areaTotal;
          if (pArea > 0 && (pArea < userArea * 0.5 || pArea > userArea * 2.0)) return false;
        }
        return true;
      });

    let filtered = applyOptional(comparaveis);
    if (filtered.length === 0) filtered = comparaveis;

    const bairroNorm = normalize(body.bairro || "");
    const mesmoBairro = filtered.filter((p) => {
      const b = normalize(p.bairro);
      return b && bairroNorm && (b.includes(bairroNorm) || bairroNorm.includes(b));
    });
    const outroBairro = filtered.filter((p) => !mesmoBairro.includes(p));

    const selected = [...mesmoBairro.slice(0, 40), ...outroBairro.slice(0, 20)];

    console.log(
      `[avaliacao-ia] Comparáveis: ${mesmoBairro.length} mesmo bairro, ${outroBairro.length} outros. Usando ${selected.length}.`,
    );

    if (selected.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Não encontramos imóveis comparáveis suficientes para estimar o valor. Tente preencher mais detalhes.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const areaInfo = body.areaConstruida
      ? `Área construída: ${body.areaConstruida}m²`
      : body.areaTotal
      ? `Área total: ${body.areaTotal}m²`
      : "Área não informada";

    const userPropertyDesc = `
Tipo: ${body.tipoImovel}
Finalidade: ${body.finalidade}
Cidade: ${body.cidade}
Bairro: ${body.bairro}
${body.cep ? `CEP: ${body.cep}` : ""}
${areaInfo}
${body.quartos ? `Quartos: ${body.quartos}` : ""}
${body.banheiros ? `Banheiros: ${body.banheiros}` : ""}
${body.vagas ? `Vagas: ${body.vagas}` : ""}
${body.descricao ? `Observações: ${body.descricao}` : ""}
    `.trim();

    const comparaveisDesc = selected
      .map(
        (p, i) =>
          `${i + 1}. ${p.tipo} em ${p.bairro} - R$${p.valor.toLocaleString("pt-BR")} | Área: ${p.areaConstruida || p.areaTotal}m² | ${p.quartos} quartos | R$${(p.valorM2 || 0).toLocaleString("pt-BR")}/m²`,
      )
      .join("\n");

    const systemPrompt = `Você é um avaliador imobiliário especialista no mercado brasileiro. 
Analise os dados do imóvel do cliente e os imóveis comparáveis disponíveis no mercado para estimar o valor do imóvel.
Considere localização, área, número de quartos, tipo do imóvel e finalidade (venda ou aluguel).
Seja preciso e realista na sua estimativa. Use os comparáveis como base.
Responda SEMPRE em português brasileiro.`;

    const userPrompt = `IMÓVEL DO CLIENTE:
${userPropertyDesc}

IMÓVEIS COMPARÁVEIS NO MERCADO (${selected.length} encontrados):
${comparaveisDesc}

Com base nesses dados, estime o valor do imóvel do cliente usando a ferramenta fornecida.`;

    console.log("[avaliacao-ia] Calling AI...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "estimativa_imovel",
              description: "Retorna a estimativa de valor do imóvel baseada na análise dos comparáveis",
              parameters: {
                type: "object",
                properties: {
                  valorEstimadoMin: { type: "number" },
                  valorEstimadoMax: { type: "number" },
                  valorM2Medio: { type: "number" },
                  imoveisComparados: { type: "number" },
                  analise: { type: "string" },
                  confianca: { type: "string", enum: ["alta", "media", "baixa"] },
                },
                required: ["valorEstimadoMin", "valorEstimadoMax", "valorM2Medio", "imoveisComparados", "analise", "confianca"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "estimativa_imovel" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiRes.text();
      console.error("[avaliacao-ia] AI error:", aiRes.status, errText);
      throw new Error("Falha na análise de IA");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("Resposta inesperada da IA");
    const estimativa = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ estimativa }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[avaliacao-ia] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao processar estimativa" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
