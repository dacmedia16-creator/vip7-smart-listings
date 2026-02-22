import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMOVIEW_API_URL = "https://api.imoview.com.br";

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

function parseCurrency(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val
      .replace(/R\$\s*/gi, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val.replace(",", ".")) || 0;
  return 0;
}

function finalidadeToCode(f: string): number | undefined {
  if (f === "vender") return 2;
  if (f === "alugar") return 1;
  return undefined;
}

function tipoToSearch(t: string): string {
  const map: Record<string, string> = {
    apartamento: "Apartamento",
    casa: "Casa",
    casa_condominio: "Casa",
    terreno: "Terreno",
    comercial: "Comercial",
    rural: "Rural",
  };
  return map[t] || "";
}

function removeNullValues(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined)
  );
}

// Resolve bairro code from Imoview API
async function resolveBairroCode(
  apiKey: string,
  codigoCidade: number,
  bairroNome: string
): Promise<number | undefined> {
  try {
    console.log(`[avaliacao-ia] Resolving bairro code for "${bairroNome}" in city ${codigoCidade}...`);
    const res = await fetch(`${IMOVIEW_API_URL}/Localizacao/RetornarBairrosDisponiveis`, {
      method: "POST",
      headers: { "Content-Type": "application/json", chave: apiKey },
      body: JSON.stringify({ codigocidade: codigoCidade }),
    });
    if (!res.ok) return undefined;

    const data = await res.json();
    const lista = Array.isArray(data) ? data : data?.lista || [];
    const bairroNorm = bairroNome.toLowerCase().trim();

    const found =
      lista.find((b: Record<string, unknown>) =>
        String(b.nome || "").toLowerCase().trim() === bairroNorm
      ) ||
      lista.find((b: Record<string, unknown>) =>
        String(b.nome || "").toLowerCase().trim().includes(bairroNorm) ||
        bairroNorm.includes(String(b.nome || "").toLowerCase().trim())
      );

    if (found) {
      const code = Number(found.codigo || found.codigobairro);
      console.log(`[avaliacao-ia] Found bairro code: ${code} for "${found.nome}"`);
      return code;
    }
    console.warn(`[avaliacao-ia] Bairro "${bairroNome}" not found`);
    return undefined;
  } catch (e) {
    console.warn("[avaliacao-ia] Failed to resolve bairro code:", e);
    return undefined;
  }
}

// Resolve tipo code from Imoview API
async function resolveTipoCode(
  apiKey: string,
  tipoImovel: string
): Promise<number | undefined> {
  try {
    const tipoSearch = tipoToSearch(tipoImovel);
    if (!tipoSearch) return undefined;

    console.log(`[avaliacao-ia] Resolving tipo code for "${tipoSearch}"...`);
    const res = await fetch(`${IMOVIEW_API_URL}/Imovel/RetornarTiposImoveisDisponiveis`, {
      method: "GET",
      headers: { "Content-Type": "application/json", chave: apiKey },
    });
    if (!res.ok) return undefined;

    const data = await res.json();
    const lista = Array.isArray(data) ? data : data?.lista || [];
    const searchNorm = tipoSearch.toLowerCase().trim();

    const found =
      lista.find((t: Record<string, unknown>) =>
        String(t.nome || "").toLowerCase().trim() === searchNorm
      ) ||
      lista.find((t: Record<string, unknown>) =>
        String(t.nome || "").toLowerCase().trim().includes(searchNorm) ||
        searchNorm.includes(String(t.nome || "").toLowerCase().trim())
      );

    if (found) {
      const code = Number(found.codigo || found.codigotipo);
      console.log(`[avaliacao-ia] Found tipo code: ${code} for "${found.nome}"`);
      return code;
    }
    console.warn(`[avaliacao-ia] Tipo "${tipoSearch}" not found`);
    return undefined;
  } catch (e) {
    console.warn("[avaliacao-ia] Failed to resolve tipo code:", e);
    return undefined;
  }
}

// Fetch properties from Imoview with given filters
async function fetchProperties(
  apiKey: string,
  filters: Record<string, unknown>,
  maxPages: number
): Promise<Record<string, unknown>[]> {
  const rawList: Record<string, unknown>[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const searchPayload: Record<string, unknown> = {
      numeroPagina: page,
      numeroRegistros: 20,
      ...filters,
    };

    console.log(`[avaliacao-ia] Searching Imoview page ${page}:`, JSON.stringify(searchPayload));

    const res = await fetch(
      `${IMOVIEW_API_URL}/Imovel/RetornarImoveisDisponiveis`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", chave: apiKey },
        body: JSON.stringify(removeNullValues(searchPayload)),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error("[avaliacao-ia] Imoview error:", res.status, txt);
      if (page === 1) throw new Error("Falha ao buscar imóveis comparáveis");
      break;
    }

    const data = await res.json();
    const pageList = Array.isArray(data) ? data : data?.lista || [];
    rawList.push(...pageList);
    console.log(`[avaliacao-ia] Page ${page}: ${pageList.length} properties (total: ${rawList.length})`);

    if (pageList.length < 20) break;
  }

  return rawList;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IMOVIEW_API_KEY = Deno.env.get("IMOVIEW_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!IMOVIEW_API_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing required API keys");
    }

    const body: RequestBody = await req.json();
    console.log("[avaliacao-ia] Request:", JSON.stringify(body));

    const finalidadeCode = finalidadeToCode(body.finalidade);
    const tipoSearch = tipoToSearch(body.tipoImovel);

    // 1. Resolve city code (existing)
    let codigoCidade: number | undefined;
    try {
      console.log(`[avaliacao-ia] Resolving city code for "${body.cidade}"...`);
      const cidadesRes = await fetch(`${IMOVIEW_API_URL}/Localizacao/RetornarCidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json", chave: IMOVIEW_API_KEY },
        body: JSON.stringify({}),
      });
      if (cidadesRes.ok) {
        const cidades = await cidadesRes.json();
        const lista = Array.isArray(cidades) ? cidades : cidades?.lista || [];
        const cidadeNormBusca = body.cidade.toLowerCase().trim();
        const found = lista.find((c: Record<string, unknown>) =>
          String(c.nome || "").toLowerCase().trim() === cidadeNormBusca
        ) || lista.find((c: Record<string, unknown>) =>
          String(c.nome || "").toLowerCase().trim().includes(cidadeNormBusca) ||
          cidadeNormBusca.includes(String(c.nome || "").toLowerCase().trim())
        );
        if (found) {
          codigoCidade = Number(found.codigo || found.codigocidade);
          console.log(`[avaliacao-ia] Found city code: ${codigoCidade} for "${found.nome}"`);
        } else {
          console.warn(`[avaliacao-ia] City "${body.cidade}" not found in API`);
        }
      }
    } catch (e) {
      console.warn("[avaliacao-ia] Failed to resolve city code:", e);
    }

    // 2. Resolve bairro code (NEW) - only if we have city code
    let codigoBairro: number | undefined;
    if (codigoCidade) {
      codigoBairro = await resolveBairroCode(IMOVIEW_API_KEY, codigoCidade, body.bairro);
    }

    // 3. Resolve tipo code (NEW)
    const codigoTipo = await resolveTipoCode(IMOVIEW_API_KEY, body.tipoImovel);

    // 4. Build filters
    const userQuartos = body.quartos ? parseNum(body.quartos) : null;
    const userVagas = body.vagas ? parseNum(body.vagas) : null;

    const baseFilters: Record<string, unknown> = {};
    if (finalidadeCode) baseFilters.finalidade = finalidadeCode;
    if (codigoCidade) baseFilters.codigocidade = codigoCidade;
    if (codigoBairro) baseFilters.codigosbairros = String(codigoBairro);
    if (codigoTipo) baseFilters.codigotipo = codigoTipo;

    const fullFilters: Record<string, unknown> = { ...baseFilters };
    if (userQuartos && userQuartos > 0) fullFilters.numeroquartos = userQuartos;
    if (userVagas && userVagas > 0) fullFilters.numerovagas = userVagas;

    const hasExtraFilters = fullFilters.numeroquartos || fullFilters.numerovagas;

    console.log(`[avaliacao-ia] Filters: ${JSON.stringify(fullFilters)}`);

    // 5. Fetch with full filters
    const MAX_PAGES = 15;
    let rawList = await fetchProperties(IMOVIEW_API_KEY, fullFilters, MAX_PAGES);

    // 6. Fallback: if too few results with quartos/vagas, retry without them
    if (rawList.length < 5 && hasExtraFilters) {
      console.log(`[avaliacao-ia] Only ${rawList.length} results with full filters, retrying without quartos/vagas...`);
      rawList = await fetchProperties(IMOVIEW_API_KEY, baseFilters, MAX_PAGES);
    }

    console.log(`[avaliacao-ia] Got ${rawList.length} properties from Imoview`);

    // 7. Post-processing filters (existing logic)
    const cidadeNorm = body.cidade.toLowerCase().trim();
    const bairroNorm = body.bairro.toLowerCase().trim();

    const userBanheiros = body.banheiros ? parseNum(body.banheiros) : null;
    const userArea = body.areaConstruida ? parseNum(body.areaConstruida) : body.areaTotal ? parseNum(body.areaTotal) : null;

    const comparaveis = rawList
      .map((item: Record<string, unknown>) => ({
        tipo: String(item.tipo || ""),
        cidade: String(item.cidade || ""),
        bairro: String(item.bairro || ""),
        valor: parseCurrency(item.valor),
        areaTotal: parseNum(item.arealote || item.areaprincipal),
        areaConstruida: parseNum(item.areaprincipal || item.areainterna),
        quartos: parseNum(item.numeroquartos),
        banheiros: parseNum(item.numerobanhos),
        vagas: parseNum(item.numerovagas),
        valorM2: parseCurrency(item.valorm2),
        finalidade: String(item.finalidade || ""),
      }))
      .filter((p: { valor: number; cidade: string; tipo: string }) => {
        if (p.valor <= 0) return false;
        if (!codigoCidade) {
          if (!p.cidade.toLowerCase().includes(cidadeNorm) && !cidadeNorm.includes(p.cidade.toLowerCase())) return false;
        }
        if (tipoSearch && !codigoTipo && !p.tipo.toLowerCase().includes(tipoSearch.toLowerCase())) return false;
        return true;
      });

    // Apply optional area/banheiros filters with tolerance
    const applyOptionalFilters = (list: typeof comparaveis) =>
      list.filter((p) => {
        if (userBanheiros !== null && (p.banheiros < userBanheiros - 1 || p.banheiros > userBanheiros + 1)) return false;
        if (userArea !== null) {
          const pArea = p.areaConstruida || p.areaTotal;
          if (pArea > 0 && (pArea < userArea * 0.5 || pArea > userArea * 2.0)) return false;
        }
        return true;
      });

    let filtered = applyOptionalFilters(comparaveis);
    let usedFallback = false;

    if (filtered.length === 0 && comparaveis.length > 0) {
      console.log("[avaliacao-ia] Optional filters too restrictive, falling back to base filters");
      filtered = comparaveis;
      usedFallback = true;
    }

    // Prioritize same bairro, then nearby
    const mesmoBairro = filtered.filter(
      (p: { bairro: string }) => p.bairro.toLowerCase().includes(bairroNorm) || bairroNorm.includes(p.bairro.toLowerCase())
    );
    const outroBairro = filtered.filter(
      (p: { bairro: string }) => !p.bairro.toLowerCase().includes(bairroNorm) && !bairroNorm.includes(p.bairro.toLowerCase())
    );

    const selected = [...mesmoBairro.slice(0, 40), ...outroBairro.slice(0, 20)];

    console.log(
      `[avaliacao-ia] Comparáveis: ${mesmoBairro.length} mesmo bairro, ${outroBairro.length} outros. Usando ${selected.length}. Fallback: ${usedFallback}`
    );

    if (selected.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Não encontramos imóveis comparáveis suficientes para estimar o valor. Tente preencher mais detalhes.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 8. Send to AI for analysis
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
        (p: { tipo: string; bairro: string; valor: number; areaConstruida: number; areaTotal: number; quartos: number; valorM2: number }, i: number) =>
          `${i + 1}. ${p.tipo} em ${p.bairro} - R$${p.valor.toLocaleString("pt-BR")} | Área: ${p.areaConstruida || p.areaTotal}m² | ${p.quartos} quartos | R$${(p.valorM2 || 0).toLocaleString("pt-BR")}/m²`
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

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                description:
                  "Retorna a estimativa de valor do imóvel baseada na análise dos comparáveis",
                parameters: {
                  type: "object",
                  properties: {
                    valorEstimadoMin: { type: "number", description: "Valor mínimo estimado em reais" },
                    valorEstimadoMax: { type: "number", description: "Valor máximo estimado em reais" },
                    valorM2Medio: { type: "number", description: "Valor médio do m² na região em reais" },
                    imoveisComparados: { type: "number", description: "Quantidade de imóveis usados na comparação" },
                    analise: { type: "string", description: "Texto explicativo da análise em português brasileiro, com 2-4 parágrafos" },
                    confianca: { type: "string", enum: ["alta", "media", "baixa"], description: "Nível de confiança baseado na quantidade e similaridade dos comparáveis" },
                  },
                  required: ["valorEstimadoMin", "valorEstimadoMax", "valorM2Medio", "imoveisComparados", "analise", "confianca"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "estimativa_imovel" } },
        }),
      }
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiRes.text();
      console.error("[avaliacao-ia] AI error:", aiRes.status, errText);
      throw new Error("Falha na análise de IA");
    }

    const aiData = await aiRes.json();
    console.log("[avaliacao-ia] AI response:", JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta inesperada da IA");
    }

    const estimativa = JSON.parse(toolCall.function.arguments);
    console.log("[avaliacao-ia] Estimativa:", JSON.stringify(estimativa));

    return new Response(JSON.stringify({ estimativa }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[avaliacao-ia] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro ao processar estimativa",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
