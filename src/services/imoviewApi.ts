import { supabase } from '@/integrations/supabase/client';

export interface ImoviewProperty {
  codigo: number;
  codigoReferencia?: string;
  titulo?: string;
  descricao?: string;
  finalidade: number; // 1 = Aluguel, 2 = Venda (conforme API Imoview)
  tipo?: string;
  tipoDescricao?: string;
  cidade?: string;
  bairro?: string;
  condominio?: string;
  endereco?: string;
  valor?: number;
  valorCondominio?: number;
  valorIptu?: number;
  areaTotal?: number;
  areaConstruida?: number;
  qtdeQuartos?: number;
  qtdeSuites?: number;
  qtdeVagas?: number;
  qtdeBanheiros?: number;
  destaque?: boolean;
  fotos?: { url: string; descricao?: string }[];
  caracteristicas?: string[];
  latitude?: number;
  longitude?: number;
  aceitaPermuta?: boolean;
  urlVideo?: string;
  dataAtualizacao?: string; // Data da última atualização (ISO string)
  dataCadastro?: string; // Data de cadastro (ISO string)
}

export interface ImoviewFilters {
  finalidade?: number; // 1 = Aluguel, 2 = Venda (conforme API Imoview)
  /**
   * A API do Imoview filtra melhor por CÓDIGO do tipo (ex: 1=Casa, 2=Apartamento).
   * Mantemos string | number para compatibilidade com a UI baseada em texto.
   */
  tipo?: string | number;
  cidade?: string; // Deprecated: use cidades[]
  cidades?: string[]; // Array de nomes de cidades (multi-select)
  codigoCidade?: number; // Deprecated: use codigosCidades[]
  codigosCidades?: number[]; // Array de códigos numéricos das cidades (multi-select)
  bairro?: string; // Deprecated: use bairros[]
  bairros?: string[]; // Array de nomes de bairros
  codigoBairro?: number; // Deprecated: use codigosBairros[]
  codigosBairros?: number[]; // Array de códigos de bairros (API filtra melhor por código)
  codigoCondominio?: number; // Código numérico do condomínio (single)
  codigosCondominio?: number[]; // Array de códigos de condomínios (multi-select)
  valorMin?: number;
  valorMax?: number;
  dormitorios?: number;
  suites?: number;
  vagas?: number;
  destaque?: boolean;
  pagina?: number;
  limite?: number;
  ordenarPor?: string;
}

export interface ImoviewCity {
  codigo: number;
  nome: string;
}

export interface ImoviewNeighborhood {
  codigo: number;
  nome: string;
  cidade?: string; // Nome da cidade associada
}

export interface ImoviewCondominium {
  codigo: number;
  nome: string;
  cidade?: string;
}

export interface ImoviewPropertyType {
  codigo: number;
  descricao: string;
}

async function callImoviewApi<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('imoview-api', {
    body: { action, params },
  });

  if (error) {
    if (import.meta.env.DEV) console.error('[imoview-service] Error:', error);
    throw new Error(error.message || 'Erro ao conectar com a API');
  }

  return data as T;
}

export interface ImoviewListResult {
  lista: ImoviewProperty[];
  quantidade: number;
}

/**
 * Normaliza string para comparação (remove acentos, lowercase)
 */
function normalizeString(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Verifica se o bairro do imóvel corresponde a QUALQUER um dos bairros no filtro
 * Usa "contém" para aceitar variações como "Campolim" -> "Parque Campolim"
 */
function matchesBairroFilter(imovelBairro: string | undefined, filtrosBairros: string[]): boolean {
  if (!imovelBairro) return false;
  const normalizedImovel = normalizeString(imovelBairro);
  // Aceita se o bairro do imóvel corresponde a QUALQUER bairro do filtro
  return filtrosBairros.some(filtroBairro => {
    const normalizedFiltro = normalizeString(filtroBairro);
    return normalizedImovel.includes(normalizedFiltro) || normalizedFiltro.includes(normalizedImovel);
  });
}

export async function listarImoveis(filters: ImoviewFilters = {}): Promise<ImoviewListResult> {
  const isDev = import.meta.env.DEV;
  try {
    if (isDev) console.log('[imoview-service] === INÍCIO listarImoveis ===');

    const condominiosSelecionados: number[] =
      filters.codigosCondominio && filters.codigosCondominio.length > 0
        ? filters.codigosCondominio
        : typeof filters.codigoCondominio === 'number'
          ? [filters.codigoCondominio]
          : [];

    // Capturar cidades para filtro - suporte a múltiplas cidades
    const codigosCidadesFiltro = filters.codigosCidades && filters.codigosCidades.length > 0
      ? filters.codigosCidades
      : typeof filters.codigoCidade === 'number' ? [filters.codigoCidade] : [];
    
    // Capturar bairros para filtro - ENVIAR CÓDIGOS para API (mais confiável)
    const bairrosFiltro = filters.bairros && filters.bairros.length > 0 
      ? filters.bairros.map(b => b.trim()).filter(Boolean)
      : filters.bairro?.trim() ? [filters.bairro.trim()] : [];
    
    // IMPORTANTE: Usar códigos numéricos dos bairros para API (funciona melhor)
    const codigosBairrosFiltro = filters.codigosBairros && filters.codigosBairros.length > 0
      ? filters.codigosBairros
      : [];
    
    const needsClientSideBairroFilter = bairrosFiltro.length > 0;
    const needsMultiCityFetch = codigosCidadesFiltro.length > 1;
    
    if (isDev) {
      console.log('[imoview-service] Cidades (códigos):', codigosCidadesFiltro);
      console.log('[imoview-service] Condomínios selecionados:', condominiosSelecionados);
    }

    // Mapear filtros de tipo "de vitrine" (Casa/Apartamento/Terreno/Comercial) para códigos reais do Imoview
    const tipoNormalized = typeof filters.tipo === 'string' ? filters.tipo.trim().toLowerCase() : null;
    const TIPO_GROUP_CODES: Record<string, number[]> = {
      casa: [1, 28], // Casa, Casa de Condomínio
      // Casa em condomínio (valor vindo da UI/URL)
      casa_condominio: [28],
      'casa de condominio': [28],
      'casa de condomínio': [28],
      apartamento: [2, 12, 18, 21, 22, 25], // Apartamento, Flat, Cobertura, Garden, Studio, Duplex
      terreno: [19, 4], // Terreno, Lote em condomínio
      comercial: [6, 8, 11, 23, 26], // Sala, Prédio, Galpão, Área, Barracão
    };

    // Converter tipo para códigos numéricos
    const tipoValues: Array<number> = (() => {
      if (typeof filters.tipo === 'number') return [filters.tipo];
      if (typeof filters.tipo === 'string') {
        if (tipoNormalized && TIPO_GROUP_CODES[tipoNormalized]) {
          return TIPO_GROUP_CODES[tipoNormalized];
        }
        // Se for uma string que não está no mapa, tentar parsear como número
        const parsed = parseInt(filters.tipo, 10);
        if (!isNaN(parsed)) return [parsed];
        // String desconhecida - não aplicar filtro de tipo
        console.log(`[imoview-service] Tipo desconhecido: "${filters.tipo}" - ignorando filtro de tipo`);
        return [];
      }
      return [];
    })();

    if (isDev) console.log(`[imoview-service] Tipo original: "${filters.tipo}" -> Códigos: [${tipoValues.join(', ')}]`);

    // Multi-fetch para múltiplos condomínios OU múltiplas cidades
    const needsMultiFetch = condominiosSelecionados.length > 0 || needsMultiCityFetch;

    if (needsMultiFetch) {
      // Para tipos, usar apenas o primeiro código se disponível
      const tipoParaFiltro = tipoValues.length > 0 ? tipoValues[0] : undefined;
      
      if (isDev) console.log('[imoview-service] Modo MULTI-FETCH ativado');
      
      const PAGE_SIZE = 20;
      const MAX_PAGES = 200;

      // Função para buscar todos os imóveis de uma cidade/condomínio específico
      const fetchAll = async (codigoCidade: number, codigoCondominio?: number, tipo?: number) => {
        const all: ImoviewProperty[] = [];
        const seen = new Set<number>();
        let pagina = 1;
        let total: number | undefined;

        for (;;) {
          // Construir filtro explicitamente para garantir que todos os parâmetros estão presentes
          const pageFilter: Record<string, unknown> = {
            finalidade: filters.finalidade,
            codigoCondominio,
            valorMin: filters.valorMin,
            valorMax: filters.valorMax,
            limite: PAGE_SIZE,
            pagina,
          };
          
          // Adicionar cidade APENAS se definida (> 0)
          if (codigoCidade > 0) {
            pageFilter.codigoCidade = codigoCidade;
          }
          
          // Adicionar tipo APENAS se definido (evitar undefined)
          if (tipo !== undefined) {
            pageFilter.codigoTipo = tipo;
          }
          
          // Adicionar bairros APENAS se definido
          if (codigosBairrosFiltro.length > 0) {
            pageFilter.codigosBairros = codigosBairrosFiltro.join(',');
          }

          const data = await callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>(
            'listarImoveis',
            pageFilter
          );

          const lista = Array.isArray(data) ? data : data?.lista || [];
          const quantidade = Array.isArray(data) ? undefined : data?.quantidade;

          if (total === undefined && typeof quantidade === 'number' && Number.isFinite(quantidade)) {
            total = quantidade;
          }

          for (const imovel of lista) {
            if (!seen.has(imovel.codigo)) {
              seen.add(imovel.codigo);
              all.push(imovel);
            }
          }

          if (lista.length === 0) break;
          if (total !== undefined && all.length >= total) break;
          if (lista.length < PAGE_SIZE) break;

          pagina += 1;
          if (pagina > MAX_PAGES) break;
        }

        return all;
      };

      const combinedList: ImoviewProperty[] = [];
      const seenCodigos = new Set<number>();
      const batchSize = 3; // OTIMIZADO: reduzido de 6 para 3 para evitar sobrecarga
      if (condominiosSelecionados.length > 0) {
        if (isDev) console.log('[imoview-service] Multi-fetch: iterando sobre condomínios');
        
        // CASO: Condomínios selecionados SEM cidade - buscar diretamente pelo condomínio
        // A API Imoview aceita codigoCondominio sem necessidade de codigoCidade
        if (codigosCidadesFiltro.length === 0) {
          for (let i = 0; i < condominiosSelecionados.length; i += batchSize) {
            const batch = condominiosSelecionados.slice(i, i + batchSize);
            const results = await Promise.all(
              batch.map((condo) => fetchAll(0, condo, tipoParaFiltro)) // cidade 0 = sem filtro de cidade
            );

            for (const lista of results) {
              for (const imovel of lista) {
                if (!seenCodigos.has(imovel.codigo)) {
                  seenCodigos.add(imovel.codigo);
                  combinedList.push(imovel);
                }
              }
            }
          }
        } else {
          // CASO: Condomínios COM cidade(s) - buscar combinação
          for (const codigoCidade of codigosCidadesFiltro) {
            for (let i = 0; i < condominiosSelecionados.length; i += batchSize) {
              const batch = condominiosSelecionados.slice(i, i + batchSize);
              const results = await Promise.all(
                batch.map((condo) => fetchAll(codigoCidade, condo, tipoParaFiltro))
              );

              for (const lista of results) {
                for (const imovel of lista) {
                  if (!seenCodigos.has(imovel.codigo)) {
                    seenCodigos.add(imovel.codigo);
                    combinedList.push(imovel);
                  }
                }
              }
            }
          }
        }
      }
      // CASO 2: Múltiplas cidades SEM condomínios - iterar sobre cada cidade
      else if (needsMultiCityFetch) {
        if (isDev) console.log('[imoview-service] Multi-fetch: iterando sobre cidades');
        
        for (let i = 0; i < codigosCidadesFiltro.length; i += batchSize) {
          const batch = codigosCidadesFiltro.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map((cidadeCodigo) => fetchAll(cidadeCodigo, undefined, tipoParaFiltro))
          );

          for (const lista of results) {
            for (const imovel of lista) {
              if (!seenCodigos.has(imovel.codigo)) {
                seenCodigos.add(imovel.codigo);
                combinedList.push(imovel);
              }
            }
          }
        }
      }

      if (isDev) console.log(`[imoview-service] Multi-fetch retornou ${combinedList.length} imóveis (antes de filtros)`);
      
      let filteredList = combinedList;
      if (needsClientSideBairroFilter && codigosBairrosFiltro.length === 0) {
        filteredList = combinedList.filter(imovel => matchesBairroFilter(imovel.bairro, bairrosFiltro));
      }

      // Aplicar filtro de faixa de preço client-side
      if (filters.valorMin !== undefined || filters.valorMax !== undefined) {
        const valorMin = filters.valorMin || 0;
        const valorMax = filters.valorMax || Infinity;
        filteredList = filteredList.filter(imovel => {
          const valor = imovel.valor || 0;
          return valor >= valorMin && valor <= valorMax;
        });
      }

      // Aplicar ordenação - padrão: mais recentes primeiro (por data de atualização)
      if (filters.ordenarPor === 'valor_asc') {
        filteredList.sort((a, b) => (a.valor || 0) - (b.valor || 0));
      } else if (filters.ordenarPor === 'valor_desc') {
        filteredList.sort((a, b) => (b.valor || 0) - (a.valor || 0));
      } else {
        // Ordenação padrão: mais recentes primeiro (dataAtualizacao DESC)
        filteredList.sort((a, b) => {
          const dateA = a.dataAtualizacao ? new Date(a.dataAtualizacao).getTime() : 0;
          const dateB = b.dataAtualizacao ? new Date(b.dataAtualizacao).getTime() : 0;
          return dateB - dateA; // Mais recentes primeiro
        });
      }

      // Aplicar paginação no resultado combinado
      const pagina = filters.pagina || 1;
      const limite = filters.limite || 20;
      const startIndex = (pagina - 1) * limite;
      const paginatedList = filteredList.slice(startIndex, startIndex + limite);

      if (isDev) console.log(`[imoview-service] Multi-fetch resultado: ${paginatedList.length} de ${filteredList.length} total`);

      return { lista: paginatedList, quantidade: filteredList.length };
    }

    // Chamada simples: enviar apenas o PRIMEIRO código numérico do tipo
    // A filtragem refinada será feita no cliente via matchesTipoFiltro()
    const tipoParaFiltroSimples = tipoValues.length > 0 ? tipoValues[0] : undefined;
    
    // Construir filtro explicitamente para garantir que todos os parâmetros estão presentes
    const simpleFilters: Record<string, unknown> = {
      finalidade: filters.finalidade,
      codigoCidade: filters.codigoCidade,
      valorMin: filters.valorMin,
      valorMax: filters.valorMax,
      limite: filters.limite,
      pagina: filters.pagina,
      ordenarPor: filters.ordenarPor,
    };
    
    // Adicionar tipo APENAS se definido
    if (tipoParaFiltroSimples !== undefined) {
      simpleFilters.codigoTipo = tipoParaFiltroSimples;
    }
    
    // Adicionar bairros APENAS se definido
    if (codigosBairrosFiltro.length > 0) {
      simpleFilters.codigosBairros = codigosBairrosFiltro.join(',');
    }

    if (isDev) console.log('[imoview-service] Chamada simples com filtros');

    // Se precisa filtrar por bairro no cliente E não temos códigos para API, buscar TODAS as páginas
    if (needsClientSideBairroFilter && codigosBairrosFiltro.length === 0) {
      if (isDev) console.log('[imoview-service] Buscando todas as páginas para filtro client-side');
      const PAGE_SIZE = 20;
      const MAX_PAGES = 100;
      const allProperties: ImoviewProperty[] = [];
      const seenCodigos = new Set<number>();
      let pagina = 1;
      let totalFromApi: number | undefined;

      for (;;) {
        const pageFilters = {
          ...simpleFilters,
          limite: PAGE_SIZE,
          pagina,
        };

        const pageData = await callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>(
          'listarImoveis',
          pageFilters as Record<string, unknown>
        );

        const lista = Array.isArray(pageData) ? pageData : pageData?.lista || [];
        const quantidade = Array.isArray(pageData) ? undefined : pageData?.quantidade;

        if (totalFromApi === undefined && typeof quantidade === 'number') {
          totalFromApi = quantidade;
        }

        for (const imovel of lista) {
          if (!seenCodigos.has(imovel.codigo)) {
            seenCodigos.add(imovel.codigo);
            allProperties.push(imovel);
          }
        }

        if (lista.length === 0) break;
        if (lista.length < PAGE_SIZE) break;
        if (totalFromApi !== undefined && allProperties.length >= totalFromApi) break;

        pagina += 1;
        if (pagina > MAX_PAGES) break;
      }

      // Aplicar filtro de bairro client-side
      const filteredByBairro = allProperties.filter(imovel => matchesBairroFilter(imovel.bairro, bairrosFiltro));

      // Aplicar ordenação - padrão: mais recentes primeiro (por data de atualização)
      if (filters.ordenarPor === 'valor_asc') {
        filteredByBairro.sort((a, b) => (a.valor || 0) - (b.valor || 0));
      } else if (filters.ordenarPor === 'valor_desc') {
        filteredByBairro.sort((a, b) => (b.valor || 0) - (a.valor || 0));
      } else {
        // Ordenação padrão: mais recentes primeiro (dataAtualizacao DESC)
        filteredByBairro.sort((a, b) => {
          const dateA = a.dataAtualizacao ? new Date(a.dataAtualizacao).getTime() : 0;
          const dateB = b.dataAtualizacao ? new Date(b.dataAtualizacao).getTime() : 0;
          return dateB - dateA; // Mais recentes primeiro
        });
      }

      const userPagina = filters.pagina || 1;
      const userLimite = filters.limite || 20;
      const startIndex = (userPagina - 1) * userLimite;
      const paginatedResult = filteredByBairro.slice(startIndex, startIndex + userLimite);

      return { lista: paginatedResult, quantidade: filteredByBairro.length };
    }

    // Chamada simples - API deve filtrar
    const data = await callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>(
      'listarImoveis',
      simpleFilters as Record<string, unknown>
    );
    
    let resultList = Array.isArray(data) ? data : data?.lista || [];
    const resultQuantidade = Array.isArray(data) ? data.length : (data?.quantidade || data?.lista?.length || 0);

    // Aplicar ordenação client-side para chamadas simples (API não suporta ordenação por data)
    if (filters.ordenarPor === 'data_desc' || !filters.ordenarPor) {
      resultList = [...resultList].sort((a, b) => {
        const dateA = a.dataAtualizacao ? new Date(a.dataAtualizacao).getTime() : 0;
        const dateB = b.dataAtualizacao ? new Date(b.dataAtualizacao).getTime() : 0;
        return dateB - dateA; // Mais recentes primeiro
      });
    }


    // Fallback de segurança para múltiplos bairros
    if (
      resultList.length === 0 &&
      resultQuantidade > 0 &&
      codigosBairrosFiltro.length > 1 &&
      (filters.pagina === undefined || filters.pagina === 1)
    ) {
      const perBairro = await Promise.all(
        codigosBairrosFiltro.map((codigoBairro) =>
          callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>(
            'listarImoveis',
            {
              ...simpleFilters,
              codigosBairros: String(codigoBairro),
              pagina: 1,
              limite: filters.limite || 20,
            } as Record<string, unknown>
          )
        )
      );

      const merged: ImoviewProperty[] = [];
      const seen = new Set<number>();
      for (const resp of perBairro) {
        const lista = Array.isArray(resp) ? resp : resp?.lista || [];
        for (const imovel of lista) {
          if (!seen.has(imovel.codigo)) {
            seen.add(imovel.codigo);
            merged.push(imovel);
          }
        }
      }

      if (merged.length > 0) {
        return {
          lista: merged.slice(0, filters.limite || 20),
          quantidade: resultQuantidade,
        };
      }
    }
    
    // Validador client-side
    let finalList = resultList;
    if (bairrosFiltro.length > 0 && resultList.length > 0) {
      finalList = resultList.filter((imovel) => matchesBairroFilter(imovel.bairro, bairrosFiltro));
    }
    
    return {
      lista: finalList,
      quantidade: finalList.length !== resultList.length ? finalList.length : resultQuantidade,
    };
  } catch (error) {
    if (import.meta.env.DEV) console.error('[imoview-service] listarImoveis error:', error);
    return { lista: [], quantidade: 0 };
  }
}

export async function detalhesImovel(codigo: string | number): Promise<ImoviewProperty | null> {
  try {
    // Converter para número se for string
    const codigoNumerico = typeof codigo === 'string' ? parseInt(codigo, 10) : codigo;
    console.log('[imoview-service] detalhesImovel - codigo:', codigo, '-> codigoNumerico:', codigoNumerico);
    
    const data = await callImoviewApi<ImoviewProperty>('detalhesImovel', { codigo: codigoNumerico });
    console.log('[imoview-service] detalhesImovel - response:', data);
    
    // Verificar se a resposta é válida
    if (!data || typeof data !== 'object') {
      console.error('[imoview-service] detalhesImovel - resposta inválida:', data);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[imoview-service] detalhesImovel error:', error);
    return null;
  }
}

export async function listarCidades(finalidade?: number): Promise<ImoviewCity[]> {
  try {
    const data = await callImoviewApi<ImoviewCity[] | { lista?: ImoviewCity[] }>('listarCidades', { finalidade });
    if (Array.isArray(data)) {
      return data;
    }
    return data?.lista || [];
  } catch (error) {
    console.error('[imoview-service] listarCidades error:', error);
    return [];
  }
}

export async function listarBairros(cidade?: string, codigoCidade?: number, finalidade?: number): Promise<ImoviewNeighborhood[]> {
  try {
    // Preferir código da cidade se disponível (mais confiável)
    const data = await callImoviewApi<ImoviewNeighborhood[] | { lista?: ImoviewNeighborhood[] }>('listarBairros', { 
      cidade, 
      codigoCidade,
      finalidade 
    });
    if (Array.isArray(data)) {
      return data;
    }
    return data?.lista || [];
  } catch (error) {
    console.error('[imoview-service] listarBairros error:', error);
    return [];
  }
}

export async function listarCondominios(cidade?: string, finalidade?: number): Promise<ImoviewCondominium[]> {
  try {
    const data = await callImoviewApi<ImoviewCondominium[] | { lista?: ImoviewCondominium[] }>('listarCondominios', { cidade, finalidade });
    if (Array.isArray(data)) {
      return data;
    }
    return data?.lista || [];
  } catch (error) {
    console.error('[imoview-service] listarCondominios error:', error);
    return [];
  }
}

export async function listarTiposImoveis(): Promise<ImoviewPropertyType[]> {
  try {
    const data = await callImoviewApi<ImoviewPropertyType[] | { lista?: ImoviewPropertyType[] }>('listarTipos');
    if (Array.isArray(data)) {
      return data;
    }
    return data?.lista || [];
  } catch (error) {
    console.error('[imoview-service] listarTiposImoveis error:', error);
    return [];
  }
}

// Helper para converter finalidade string para número (conforme API Imoview: 1 = Aluguel, 2 = Venda)
export function getFinalidadeCode(finalidade: string): number | undefined {
  switch (finalidade) {
    case 'venda':
      return 2; // API Imoview: 2 = Venda
    case 'aluguel':
      return 1; // API Imoview: 1 = Aluguel
    default:
      return undefined;
  }
}

// Helper para formatar valor
export function formatPropertyValue(value: number | undefined, isRental: boolean = false): string {
  if (!value) return 'Sob consulta';
  
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  
  return isRental ? `${formatted}/mês` : formatted;
}

// Função para contar imóveis por condomínio (usando cache)
export async function contarImoveisPorCondominio(
  codigoCondominio: number,
  finalidade?: number
): Promise<number> {
  try {
    const result = await listarImoveis({
      codigoCondominio,
      finalidade,
      limite: 1,
      pagina: 1,
    });
    return result.quantidade;
  } catch (error) {
    console.error('[imoview-service] contarImoveisPorCondominio error:', error);
    return 0;
  }
}
