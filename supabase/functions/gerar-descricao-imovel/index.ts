// Edge function: gerar descrição imobiliária com IA via Lovable AI Gateway
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imovel } = await req.json();
    if (!imovel || typeof imovel !== 'object') {
      return new Response(JSON.stringify({ error: 'imovel obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filtra somente campos preenchidos para reduzir contexto
    const filtered: Record<string, any> = {};
    for (const [k, v] of Object.entries(imovel)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      filtered[k] = v;
    }

    const system = `Você é um redator publicitário especialista em imóveis de alto padrão no Brasil.
Escreva descrições comerciais profissionais, em português do Brasil, com tom sofisticado, claro e persuasivo.
REGRAS:
- Use APENAS as informações fornecidas. NÃO invente metragens, características, vagas, lazer, localização ou preço.
- Não cite valores monetários.
- Não use emojis.
- Texto corrido em 3 a 6 parágrafos curtos, fluído, sem listas com bullets.
- Destaque diferenciais reais: tipo, localização, áreas, dormitórios/suítes, vagas, lazer e características.
Retorne JSON com:
{ "descricao": "texto completo...", "meta_description": "até 155 caracteres, SEO." }`;

    const userMsg = `Gere a descrição para este imóvel (campos preenchidos):\n${JSON.stringify(filtered, null, 2)}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(JSON.stringify({ error: 'Falha no AI Gateway', detail: txt }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { descricao: String(content) }; }

    return new Response(JSON.stringify({
      descricao: String(parsed.descricao || '').trim(),
      meta_description: String(parsed.meta_description || '').trim().slice(0, 160),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
