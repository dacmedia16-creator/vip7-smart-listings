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
}

export interface ImoviewFilters {
  finalidade?: number; // 1 = Aluguel, 2 = Venda (conforme API Imoview)
  /**
   * A API do Imoview filtra melhor por CÓDIGO do tipo (ex: 1=Casa, 2=Apartamento).
   * Mantemos string | number para compatibilidade com a UI baseada em texto.
   */
  tipo?: string | number;
  cidade?: string;
  bairro?: string;
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
    console.error('[imoview-service] Error:', error);
    throw new Error(error.message || 'Erro ao conectar com a API');
  }

  return data as T;
}

export interface ImoviewListResult {
  lista: ImoviewProperty[];
  quantidade: number;
}

export async function listarImoveis(filters: ImoviewFilters = {}): Promise<ImoviewListResult> {
  try {
    const condominiosSelecionados: number[] =
      filters.codigosCondominio && filters.codigosCondominio.length > 0
        ? filters.codigosCondominio
        : typeof filters.codigoCondominio === 'number'
          ? [filters.codigoCondominio]
          : [];

    // Mapear filtros de tipo "de vitrine" (Casa/Apartamento/Terreno/Comercial) para códigos reais do Imoview
    const tipoNormalized = typeof filters.tipo === 'string' ? filters.tipo.trim().toLowerCase() : null;
    const TIPO_GROUP_CODES: Record<string, number[]> = {
      casa: [1, 28], // Casa, Casa de Condomínio
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

    console.log(`[imoview-service] Tipo original: "${filters.tipo}" -> Códigos: [${tipoValues.join(', ')}]`);

    // Multi-fetch APENAS para múltiplos condomínios selecionados
    // Para tipos, enviamos apenas o PRIMEIRO código numérico e confiamos na filtragem do cliente
    const needsMultiFetch = condominiosSelecionados.length > 0;

    if (needsMultiFetch) {
      const PAGE_SIZE = 20;
      const MAX_PAGES = 200;

      const fetchAll = async (codigoCondominio?: number, tipo?: number) => {
        const all: ImoviewProperty[] = [];
        const seen = new Set<number>();
        let pagina = 1;
        let total: number | undefined;

        for (;;) {
          const pageFilter = {
            ...filters,
            tipo,
            codigoCondominio,
            codigosCondominio: undefined,
            limite: PAGE_SIZE,
            pagina,
          };

          const data = await callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>(
            'listarImoveis',
            pageFilter as Record<string, unknown>
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

      const condominiosLoop = condominiosSelecionados;
      // Para tipos, usar apenas o primeiro código se disponível
      const tipoParaFiltro = tipoValues.length > 0 ? tipoValues[0] : undefined;

      const combinedList: ImoviewProperty[] = [];
      const seenCodigos = new Set<number>();

      const batchSize = 6;
      for (let i = 0; i < condominiosLoop.length; i += batchSize) {
        const batch = condominiosLoop.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((condo) => fetchAll(condo, tipoParaFiltro)));

        for (const lista of results) {
          for (const imovel of lista) {
            if (!seenCodigos.has(imovel.codigo)) {
              seenCodigos.add(imovel.codigo);
              combinedList.push(imovel);
            }
          }
        }
      }

      // Aplicar ordenação se necessário
      if (filters.ordenarPor === 'valor_asc') {
        combinedList.sort((a, b) => (a.valor || 0) - (b.valor || 0));
      } else if (filters.ordenarPor === 'valor_desc') {
        combinedList.sort((a, b) => (b.valor || 0) - (a.valor || 0));
      }

      // Aplicar paginação no resultado combinado
      const pagina = filters.pagina || 1;
      const limite = filters.limite || 20;
      const startIndex = (pagina - 1) * limite;
      const paginatedList = combinedList.slice(startIndex, startIndex + limite);

      return { lista: paginatedList, quantidade: combinedList.length };
    }

    // Chamada simples: enviar apenas o PRIMEIRO código numérico do tipo
    // A filtragem refinada será feita no cliente via matchesTipoFiltro()
    const simpleFilters = {
      ...filters,
      tipo: tipoValues.length > 0 ? tipoValues[0] : undefined,
    };

    console.log(`[imoview-service] Chamada simples com tipo: ${simpleFilters.tipo}`);

    const data = await callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>(
      'listarImoveis',
      simpleFilters as Record<string, unknown>
    );
    if (Array.isArray(data)) {
      return { lista: data, quantidade: data.length };
    }
    return {
      lista: data?.lista || [],
      quantidade: data?.quantidade || data?.lista?.length || 0,
    };
  } catch (error) {
    console.error('[imoview-service] listarImoveis error:', error);
    return { lista: [], quantidade: 0 };
  }
}

export async function detalhesImovel(codigo: string | number): Promise<ImoviewProperty | null> {
  try {
    const data = await callImoviewApi<ImoviewProperty>('detalhesImovel', { codigo });
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

export async function listarBairros(cidade?: string, finalidade?: number): Promise<ImoviewNeighborhood[]> {
  try {
    const data = await callImoviewApi<ImoviewNeighborhood[] | { lista?: ImoviewNeighborhood[] }>('listarBairros', { cidade, finalidade });
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
