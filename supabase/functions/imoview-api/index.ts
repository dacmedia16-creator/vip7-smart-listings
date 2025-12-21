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
    console.log(`[imoview-api] Action: ${action}, Params:`, JSON.stringify(params));

    let endpoint = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'listarImoveis': {
        endpoint = '/Imovel/RetornarImoveisDisponiveis';
        method = 'POST';

        const pagina = Number(params?.pagina ?? 1);
        const numeroregistros = Number(params?.limite ?? 50);

        // Formato correto baseado na API Imoview
        const listarImoveisBody: Record<string, unknown> = {
          finalidade: params?.finalidade,
          tipo: params?.tipo,
          cidade: params?.cidade,
          bairro: params?.bairro,
          valorMinimo: params?.valorMin,
          valorMaximo: params?.valorMax,
          qtdeQuartos: params?.dormitorios,
          qtdeSuites: params?.suites,
          qtdeVagas: params?.vagas,
          pagina,
          numeroregistros,
          ordenarPor: params?.ordenarPor,
        };

        // Suporte a código numérico de condomínio (codigocondominio)
        if (params?.codigoCondominio) {
          listarImoveisBody.codigocondominio = Number(params.codigoCondominio);
        }

        if (params?.destaque === true) {
          listarImoveisBody.destaque = 1;
        } else if (params?.destaque === false) {
          listarImoveisBody.destaque = 0;
        }

        const cleaned = removeNullValues(listarImoveisBody);
        console.log('[imoview-api] listarImoveis body:', JSON.stringify(cleaned));
        body = JSON.stringify(cleaned);
        break;
      }

      case 'detalhesImovel':
        endpoint = `/Imovel/RetornarDetalhesImovelDisponivel?codigoimovel=${params?.codigo}`;
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
    if (body) {
      console.log(`[imoview-api] Request body: ${body}`);
    }

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
    
    // Log detalhado da resposta para debug
    if (action === 'listarImoveis') {
      const d = data as Record<string, unknown>;
      console.log(`[imoview-api] Response keys:`, Object.keys(d));
      console.log(`[imoview-api] quantidade:`, d.quantidade);
      console.log(`[imoview-api] lista type:`, typeof d.lista);
      console.log(`[imoview-api] lista length:`, Array.isArray(d.lista) ? d.lista.length : 'not array');
      
      // Se lista estiver em outro campo, tentar encontrar
      if (d.imoveis && Array.isArray(d.imoveis)) {
        console.log(`[imoview-api] Found 'imoveis' array with ${d.imoveis.length} items`);
        d.lista = d.imoveis;
      }
      
      // Log primeiro item se existir
      if (Array.isArray(d.lista) && d.lista.length > 0) {
        console.log(`[imoview-api] First item keys:`, Object.keys(d.lista[0]));
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
