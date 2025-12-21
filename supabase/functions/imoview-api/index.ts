import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const IMOVIEW_API_KEY = Deno.env.get('IMOVIEW_API_KEY');
const IMOVIEW_API_URL = 'https://api.imoview.com.br';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function to remove null and undefined values from objects
function removeNullValues(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined)
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    console.log(`[imoview-api] Action: ${action}, Params:`, params);

    let endpoint = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'listarImoveis': {
        endpoint = '/Imovel/RetornarImoveisDisponiveis';
        method = 'POST';

        const pagina = Number(params?.pagina ?? 1);
        const registrosPorPagina = Number(params?.limite ?? 12);
        const inicio = Math.max(0, (pagina - 1) * registrosPorPagina);

        // Observação: alguns convênios/instâncias do Imoview aceitam nomes de paginação diferentes.
        // Enviamos os campos “mais comuns” juntos para maximizar compatibilidade.
        const listarImoveisBody: Record<string, unknown> = {
          finalidade: params?.finalidade,
          tipo: params?.tipo,
          cidade: params?.cidade,
          bairro: params?.bairro,
          condominio: params?.condominio,
          valorMinimo: params?.valorMin,
          valorMaximo: params?.valorMax,
          qtdeQuartos: params?.dormitorios,
          qtdeSuites: params?.suites,
          qtdeVagas: params?.vagas,

          // paginação (principais)
          pagina,
          registrosPorPagina,

          // paginação (aliases comuns)
          paginaAtual: pagina,
          quantidadeRegistros: registrosPorPagina,
          itensPorPagina: registrosPorPagina,
          offset: inicio,
          inicio,

          ordenarPor: params?.ordenarPor,
        };

        if (params?.destaque === true) {
          listarImoveisBody.destaque = 1;
        } else if (params?.destaque === false) {
          listarImoveisBody.destaque = 0;
        }

        const cleaned = removeNullValues(listarImoveisBody);
        console.log('[imoview-api] listarImoveis body:', cleaned);
        body = JSON.stringify(cleaned);
        break;
      }

      case 'detalhesImovel':
        endpoint = `/Imovel/RetornarDetalhesImovelDisponivel?codigo=${params?.codigo}`;
        method = 'GET';
        break;

      case 'listarCidades':
        endpoint = '/Imovel/RetornarCidadesDisponiveis';
        method = 'POST';
        body = JSON.stringify(removeNullValues({
          finalidade: params?.finalidade,
        }));
        break;

      case 'listarBairros':
        endpoint = '/Imovel/RetornarBairrosDisponiveis';
        method = 'POST';
        body = JSON.stringify(removeNullValues({
          cidade: params?.cidade,
          finalidade: params?.finalidade,
        }));
        break;

      case 'listarCondominios':
        endpoint = '/Imovel/RetornarCondominiosDisponiveis';
        method = 'POST';
        body = JSON.stringify(removeNullValues({
          cidade: params?.cidade,
          finalidade: params?.finalidade,
        }));
        break;

      case 'listarTipos':
        endpoint = '/Imovel/RetornarTiposImoveisDisponiveis';
        method = 'GET';
        break;

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    console.log(`[imoview-api] Calling: ${method} ${IMOVIEW_API_URL}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'chave': IMOVIEW_API_KEY || '',
      },
    };

    if (body && method === 'POST') {
      fetchOptions.body = body;
    }

    const response = await fetch(`${IMOVIEW_API_URL}${endpoint}`, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[imoview-api] Error response: ${response.status} - ${errorText}`);
      throw new Error(`API Imoview retornou erro: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[imoview-api] Success, received data:`, typeof data === 'object' ? 'object' : data);

    // Alguns convênios do Imoview retornam apenas os metadados (quantidade/maiorvalor/menorvalor)
    // e deixam a lista vazia no POST. Nesses casos tentamos uma chamada GET com querystring.
    if (action === 'listarImoveis' && data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const quantidade = Number(d.quantidade ?? 0);
      const lista = d.lista;

      if (quantidade > 0 && Array.isArray(lista) && lista.length === 0) {
        console.warn('[imoview-api] listarImoveis returned quantidade > 0 but empty lista. Retrying with GET querystring...');

        const pagina = Number(params?.pagina ?? 1);
        const registrosPorPagina = Number(params?.limite ?? 12);

        const qsObj: Record<string, unknown> = {
          finalidade: params?.finalidade,
          tipo: params?.tipo,
          cidade: params?.cidade,
          bairro: params?.bairro,
          condominio: params?.condominio,
          valorMinimo: params?.valorMin,
          valorMaximo: params?.valorMax,
          qtdeQuartos: params?.dormitorios,
          qtdeSuites: params?.suites,
          qtdeVagas: params?.vagas,
          pagina,
          registrosPorPagina,
          ordenarPor: params?.ordenarPor,
        };

        if (params?.destaque === true) qsObj.destaque = 1;
        if (params?.destaque === false) qsObj.destaque = 0;

        const qsClean = removeNullValues(qsObj);
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(qsClean)) {
          search.set(k, String(v));
        }

        const url = `${IMOVIEW_API_URL}${endpoint}?${search.toString()}`;
        console.log('[imoview-api] Fallback GET:', url);

        const fallbackResp = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'chave': IMOVIEW_API_KEY || '',
          },
        });

        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          const fallbackLista = (fallbackData as any)?.lista;
          console.log('[imoview-api] Fallback success. lista length:', Array.isArray(fallbackLista) ? fallbackLista.length : 'n/a');

          if (Array.isArray(fallbackLista) && fallbackLista.length > 0) {
            return new Response(JSON.stringify(fallbackData), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          const errorText = await fallbackResp.text();
          console.warn(`[imoview-api] Fallback GET failed: ${fallbackResp.status} - ${errorText}`);
        }
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[imoview-api] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
