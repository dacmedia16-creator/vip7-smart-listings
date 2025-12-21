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
  codigoCondominio?: number; // Código numérico do condomínio
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
    const data = await callImoviewApi<ImoviewProperty[] | { lista?: ImoviewProperty[]; quantidade?: number }>('listarImoveis', filters as Record<string, unknown>);
    // A API pode retornar um array direto ou um objeto com propriedade 'lista' e 'quantidade'
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
