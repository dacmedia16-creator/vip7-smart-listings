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

  // Log raw value fields for debugging
  console.log(`[imoview-api] Raw valor: ${raw.valor} (${typeof raw.valor})`);

  // Helper function to parse Brazilian currency format
  // Handles formats like: "R$ 780.000,00", "780.000,00", "780000", 780000
  const parseCurrencyValue = (val: unknown): number => {
    if (typeof val === 'number') {
      return val;
    }
    if (typeof val === 'string') {
      // Remove "R$", espaços e outros caracteres não numéricos exceto pontos e vírgulas
      const cleanedValue = val
        .replace(/R\$\s*/gi, '')  // Remove "R$ "
        .replace(/\s/g, '')       // Remove espaços
        .replace(/\./g, '')       // Remove pontos de milhar (ex: 780.000 -> 780000)
        .replace(',', '.');       // Troca vírgula por ponto (ex: 780000,00 -> 780000.00)
      
      const parsed = parseFloat(cleanedValue);
      console.log(`[imoview-api] Parsing currency: "${val}" -> cleaned: "${cleanedValue}" -> parsed: ${parsed}`);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Convert valor to number
  const valorNumerico = parseCurrencyValue(raw.valor);
  console.log(`[imoview-api] Valor convertido: ${valorNumerico}`);

  // Convert valorcondominio to number
  const valorCondominioNumerico = parseCurrencyValue(raw.valorcondominio);

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

      case 'listarCondominios': {
        console.log('[imoview-api] listarCondominios params:', JSON.stringify(params));

        const getCityName = (cidade: Record<string, unknown>) => {
          const name =
            cidade?.nome ??
            cidade?.cidade ??
            cidade?.descricao ??
            cidade?.name ??
            cidade?.label;
          return String(name ?? '').trim();
        };

        const getCondominioCodigo = (cond: Record<string, unknown>) => {
          const raw =
            cond?.codigo ??
            cond?.codigoCondominio ??
            cond?.codigocondominio ??
            cond?.codigoauxiliar ??
            cond?.id;
          if (raw === null || raw === undefined) return null;
          const s = String(raw).trim();
          return s.length ? s : null;
        };

        const getCondominioNome = (cond: Record<string, unknown>) => {
          const raw = cond?.nome ?? cond?.nomecondominio ?? cond?.descricao ?? cond?.label;
          return String(raw ?? '').trim();
        };

        const extractCondominios = (condData: unknown, cityNameForEnrichment?: string) => {
          const data = condData as Record<string, unknown> | null;
          const lista =
            Array.isArray(condData)
              ? (condData as Record<string, unknown>[])
              : Array.isArray(data?.lista)
                ? (data!.lista as Record<string, unknown>[])
                : [];

          const quantidadeRaw = !Array.isArray(condData) && data ? data.quantidade : undefined;
          const quantidade =
            typeof quantidadeRaw === 'number'
              ? quantidadeRaw
              : typeof quantidadeRaw === 'string'
                ? Number(quantidadeRaw)
                : undefined;

          // Enrich each condomínio with city name
          const enrichedLista = lista.map((cond) => ({
            ...cond,
            cidade: (cond.cidade as string) || cityNameForEnrichment || '',
          }));

          return { lista: enrichedLista, quantidade: Number.isFinite(quantidade) ? quantidade : undefined };
        };

        const fetchCondominiosPage = async (payload: Record<string, unknown>) => {
          const response = await fetch(`${IMOVIEW_API_URL}/Imovel/RetornarCondominiosDisponiveis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'chave': IMOVIEW_API_KEY || '',
            },
            body: JSON.stringify(removeNullValues(payload)),
          });

          if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Failed condominios: ${response.status} - ${txt}`);
          }

          return response.json();
        };

        const fetchAllCondominiosForCity = async (cityName: string) => {
          const all: Record<string, unknown>[] = [];
          const pageSize = 20; // limite da API
          let pagina = 1;
          let total: number | undefined;

          for (;;) {
            const condData = await fetchCondominiosPage({
              cidade: cityName,
              finalidade: params?.finalidade,
              pagina,
              numeroregistros: pageSize,
            });

            const { lista, quantidade } = extractCondominios(condData, cityName);
            if (total === undefined) total = quantidade;

            all.push(...lista);

            console.log(
              `[imoview-api] City ${cityName}: page ${pagina} -> ${lista.length} items (acc=${all.length}, total=${total ?? 'n/a'})`,
            );

            // Sem itens: parar para evitar loop infinito
            if (lista.length === 0) break;

            // Se a API não retornar total, usar a página vazia como condição de parada
            if (total === undefined) {
              pagina += 1;
              // segurança extra: evita execução infinita se a API repetir itens
              if (pagina > 200) break;
              continue;
            }

            if (all.length >= total) break;

            pagina += 1;
            if (pagina > 200) break;
          }

          return all;
        };

        // 1) Se NÃO tiver cidade: agregar condomínios de todas as cidades (com paginação)
        if (!params?.cidade) {
          console.log('[imoview-api] No city specified, fetching condominios from all cities (paginated)...');

          const cidadesResponse = await fetch(`${IMOVIEW_API_URL}/Imovel/RetornarCidadesDisponiveis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'chave': IMOVIEW_API_KEY || '',
            },
            body: JSON.stringify(removeNullValues({ finalidade: params?.finalidade })),
          });

          if (!cidadesResponse.ok) {
            throw new Error(`Failed to fetch cities: ${cidadesResponse.status}`);
          }

          const cidadesData = await cidadesResponse.json();
          const cidades = Array.isArray(cidadesData) ? cidadesData : cidadesData?.lista || [];
          console.log(`[imoview-api] Found ${cidades.length} cities`);
          if (cidades.length > 0) console.log('[imoview-api] First city sample:', JSON.stringify(cidades[0]));

          const allCondominios: Record<string, unknown>[] = [];
          const seenCodigos = new Set<string>();

          // Reduzindo concorrência: paginação multiplica requisições
          const batchSize = 4;
          for (let i = 0; i < cidades.length; i += batchSize) {
            const batch = cidades.slice(i, i + batchSize);

            const results = await Promise.all(
              batch.map(async (cidade: Record<string, unknown>) => {
                const cityName = getCityName(cidade);
                if (!cityName) return [];

                try {
                  const list = await fetchAllCondominiosForCity(cityName);
                  if (list.length > 0) {
                    console.log(`[imoview-api] City ${cityName}: first cond keys:`, Object.keys(list[0] ?? {}));
                  }
                  return list;
                } catch (e) {
                  console.error(`[imoview-api] Error fetching condominios for city ${cityName}:`, e);
                  return [];
                }
              }),
            );

            for (const condList of results) {
              for (const cond of condList) {
                const codigo = getCondominioCodigo(cond);
                if (!codigo) {
                  allCondominios.push(cond);
                  continue;
                }
                if (!seenCodigos.has(codigo)) {
                  seenCodigos.add(codigo);
                  allCondominios.push(cond);
                }
              }
            }
          }

          allCondominios.sort((a, b) => getCondominioNome(a).localeCompare(getCondominioNome(b)));
          console.log(
            `[imoview-api] Total unique condominios found: ${seenCodigos.size} (total items returned: ${allCondominios.length})`,
          );

          return new Response(JSON.stringify(allCondominios), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 2) Se tiver cidade: também paginar (para não ficar travado em 20)
        const cityName = String(params?.cidade ?? '').trim();
        console.log(`[imoview-api] City specified (${cityName}), fetching condominios (paginated)...`);

        const list = await fetchAllCondominiosForCity(cityName);
        list.sort((a, b) => getCondominioNome(a).localeCompare(getCondominioNome(b)));

        return new Response(JSON.stringify(list), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }


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
      // Log da resposta RAW completa para diagnóstico
      console.log(`[imoview-api] Raw details response FULL:`, JSON.stringify(data).substring(0, 2000));
      console.log(`[imoview-api] Raw details response keys:`, Object.keys(data as Record<string, unknown>));
      
      // A API de detalhes pode encapsular os dados dentro de uma propriedade
      const rawData = data as Record<string, unknown>;
      let propertyData: Record<string, unknown>;
      
      // Verificar diferentes estruturas possíveis da resposta
      if (rawData.imovel && typeof rawData.imovel === 'object') {
        console.log(`[imoview-api] Data found in 'imovel' property`);
        propertyData = rawData.imovel as Record<string, unknown>;
      } else if (rawData.dados && typeof rawData.dados === 'object') {
        console.log(`[imoview-api] Data found in 'dados' property`);
        propertyData = rawData.dados as Record<string, unknown>;
      } else if (rawData.resultado && typeof rawData.resultado === 'object') {
        console.log(`[imoview-api] Data found in 'resultado' property`);
        propertyData = rawData.resultado as Record<string, unknown>;
      } else if (rawData.codigo || rawData.titulo || rawData.valor) {
        console.log(`[imoview-api] Data at root level`);
        propertyData = rawData;
      } else {
        // Tentar encontrar qualquer objeto aninhado que contenha dados do imóvel
        console.log(`[imoview-api] Looking for nested property data...`);
        const possibleKeys = Object.keys(rawData);
        console.log(`[imoview-api] Available keys:`, possibleKeys);
        
        // Se tiver apenas uma chave e for um objeto, usar ela
        if (possibleKeys.length === 1 && typeof rawData[possibleKeys[0]] === 'object' && rawData[possibleKeys[0]] !== null) {
          console.log(`[imoview-api] Using single nested object: ${possibleKeys[0]}`);
          propertyData = rawData[possibleKeys[0]] as Record<string, unknown>;
        } else {
          // Última tentativa - usar os dados como estão
          console.log(`[imoview-api] Using raw data as-is`);
          propertyData = rawData;
        }
      }
      
      console.log(`[imoview-api] Property data keys:`, Object.keys(propertyData));
      console.log(`[imoview-api] Property data sample:`, JSON.stringify(propertyData).substring(0, 1000));
      
      console.log(`[imoview-api] Mapping property details`);
      const mappedData = mapImoviewProperty(propertyData);
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
