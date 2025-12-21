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
  tipo?: string;
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
    // Se houver múltiplos condomínios, fazer requisições paralelas SEM limite para buscar TODOS
    if (filters.codigosCondominio && filters.codigosCondominio.length > 0) {
      const requests = filters.codigosCondominio.map((codigo) => {
        // Remover limite e paginação para buscar TODOS os imóveis de cada condomínio
        const singleFilter = { 
          ...filters, 
          codigoCondominio: codigo, 
          codigosCondominio: undefined,
          limite: 500, // Limite alto para buscar todos de cada condomínio
          pagina: 1,
        };
        return callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>(
          'listarImoveis',
          singleFilter as Record<string, unknown>
        );
      });

      const results = await Promise.all(requests);
      
      // Combinar resultados e remover duplicatas
      const seenCodigos = new Set<number>();
      const combinedList: ImoviewProperty[] = [];

      for (const data of results) {
        const lista = Array.isArray(data) ? data : data?.lista || [];

        for (const imovel of lista) {
          if (!seenCodigos.has(imovel.codigo)) {
            seenCodigos.add(imovel.codigo);
            combinedList.push(imovel);
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

    // Comportamento original para single ou nenhum condomínio
    const data = await callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>('listarImoveis', filters as Record<string, unknown>);
    if (Array.isArray(data)) {
      return { lista: data, quantidade: data.length };
    }
    return { 
      lista: data?.lista || [], 
      quantidade: data?.quantidade || data?.lista?.length || 0 
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
