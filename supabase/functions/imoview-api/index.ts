import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const IMOVIEW_API_KEY = Deno.env.get('IMOVIEW_API_KEY');
const IMOVIEW_API_URL = 'https://api.imoview.com.br';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      case 'listarImoveis':
        endpoint = '/Imovel/RetornarImoveisDisponiveis';
        method = 'POST';
        body = JSON.stringify({
          finalidade: params?.finalidade || null, // 1 = Venda, 2 = Aluguel
          tipo: params?.tipo || null,
          cidade: params?.cidade || null,
          bairro: params?.bairro || null,
          condominio: params?.condominio || null,
          valorMinimo: params?.valorMin || null,
          valorMaximo: params?.valorMax || null,
          qtdeQuartos: params?.dormitorios || null,
          qtdeSuites: params?.suites || null,
          qtdeVagas: params?.vagas || null,
          destaque: params?.destaque === true ? 1 : (params?.destaque === false ? 0 : null),
          pagina: params?.pagina || 1,
          registrosPorPagina: params?.limite || 12,
          ordenarPor: params?.ordenarPor || null,
        });
        break;

      case 'detalhesImovel':
        endpoint = `/Imovel/RetornarDetalhesImovelDisponivel?codigo=${params?.codigo}`;
        method = 'GET';
        break;

      case 'listarCidades':
        endpoint = '/Imovel/RetornarCidadesDisponiveis';
        method = 'POST';
        body = JSON.stringify({
          finalidade: params?.finalidade || null,
        });
        break;

      case 'listarBairros':
        endpoint = '/Imovel/RetornarBairrosDisponiveis';
        method = 'POST';
        body = JSON.stringify({
          cidade: params?.cidade || null,
          finalidade: params?.finalidade || null,
        });
        break;

      case 'listarCondominios':
        endpoint = '/Imovel/RetornarCondominiosDisponiveis';
        method = 'POST';
        body = JSON.stringify({
          cidade: params?.cidade || null,
          finalidade: params?.finalidade || null,
        });
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
