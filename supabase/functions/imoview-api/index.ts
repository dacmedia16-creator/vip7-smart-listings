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

// Function to map Imoview API response to frontend expected format
function mapImoviewProperty(raw: Record<string, unknown>): Record<string, unknown> {
  // A API Imoview retorna finalidade como string: "Venda" ou "Aluguel"
  // Convertemos para: 1 = Aluguel, 2 = Venda (conforme documentação API Imoview)
  let finalidadeCode = 2; // default venda
  const rawFinalidade = raw.finalidade;
  
  if (typeof rawFinalidade === 'string') {
    // Se for string, verificar se contém "aluguel" (case insensitive)
    finalidadeCode = rawFinalidade.toLowerCase().includes('aluguel') ? 1 : 2;
  } else if (typeof rawFinalidade === 'number') {
    // Se já vier como número da API, usar diretamente
    finalidadeCode = rawFinalidade;
  }
  
  console.log(`[imoview-api] Raw finalidade: "${rawFinalidade}" (${typeof rawFinalidade}) -> Mapped: ${finalidadeCode}`);

  // Convert valor to number
  let valorNumerico = 0;
  if (typeof raw.valor === 'number') {
    valorNumerico = raw.valor;
  } else if (typeof raw.valor === 'string') {
    valorNumerico = parseFloat(String(raw.valor).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  }

  // Convert valorcondominio to number
  let valorCondominioNumerico = 0;
  if (typeof raw.valorcondominio === 'number') {
    valorCondominioNumerico = raw.valorcondominio;
  } else if (typeof raw.valorcondominio === 'string') {
    valorCondominioNumerico = parseFloat(String(raw.valorcondominio).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  }

  // Build fotos array from urlfotoprincipal and existing fotos
  const fotos: Array<{ url: string; descricao?: string }> = [];
  if (raw.urlfotoprincipal && typeof raw.urlfotoprincipal === 'string') {
    fotos.push({ url: raw.urlfotoprincipal, descricao: 'Foto principal' });
  }
  if (Array.isArray(raw.fotos)) {
    fotos.push(...raw.fotos.map((f: Record<string, unknown>) => ({
      url: String(f.url || f.arquivo || ''),
      descricao: String(f.descricao || '')
    })));
  }

  // Parse area values
  const parseArea = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return parseFloat(val.replace(',', '.')) || 0;
    }
    return 0;
  };

  // Parse integer values
  const parseInt2 = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val) || 0;
    return 0;
  };

  return {
    codigo: raw.codigo,
    codigoReferencia: raw.codigoauxiliar || raw.codigo,
    titulo: raw.titulo || `${raw.tipo || 'Imóvel'} em ${raw.bairro || 'localização'}`,
    descricao: raw.descricao || raw.metadescription || '',
    finalidade: finalidadeCode,
    tipo: raw.tipo || '',
    tipoDescricao: raw.tipo || '',
    cidade: raw.cidade || '',
    bairro: raw.bairro || '',
    condominio: raw.nomecondominio || '',
    endereco: raw.endereco || '',
    valor: valorNumerico,
    valorCondominio: valorCondominioNumerico,
    areaTotal: parseArea(raw.arealote || raw.areaprincipal),
    areaConstruida: parseArea(raw.areaprincipal || raw.areainterna),
    qtdeQuartos: parseInt2(raw.numeroquartos),
    qtdeSuites: parseInt2(raw.numerosuites),
    qtdeVagas: parseInt2(raw.numerovagas),
    qtdeBanheiros: parseInt2(raw.numerobanhos),
    destaque: raw.destaque === 'Destaque' || raw.destaque === 1 || raw.destaque === '1',
    fotos: fotos,
    latitude: parseArea(raw.latitude) || undefined,
    longitude: parseArea(raw.longitude) || undefined,
    // Keep original fields that might be needed
    estado: raw.estado || '',
    cep: raw.cep || '',
    numero: raw.numero || '',
    complemento: raw.complemento || '',
  };
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
        const numeroregistros = Math.min(Number(params?.limite ?? 20), 20); // API Imoview limita a 20 registros

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
    
    // Process response based on action
    if (action === 'listarImoveis') {
      const d = data as Record<string, unknown>;
      console.log(`[imoview-api] Response keys:`, Object.keys(d));
      console.log(`[imoview-api] quantidade:`, d.quantidade);
      
      // Map properties to frontend format
      if (Array.isArray(d.lista)) {
        console.log(`[imoview-api] Mapping ${d.lista.length} properties`);
        const mappedList = d.lista.map(mapImoviewProperty);
        d.lista = mappedList;
        if (mappedList.length > 0) {
          console.log(`[imoview-api] First mapped item:`, JSON.stringify(mappedList[0]).substring(0, 500));
        }
      }
      
      return new Response(JSON.stringify(d), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'detalhesImovel') {
      console.log(`[imoview-api] Mapping property details`);
      const mappedData = mapImoviewProperty(data as Record<string, unknown>);
      console.log(`[imoview-api] Mapped details:`, JSON.stringify(mappedData).substring(0, 500));
      
      return new Response(JSON.stringify(mappedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
