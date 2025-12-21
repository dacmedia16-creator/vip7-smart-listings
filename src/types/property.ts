export interface Property {
  id: string;
  titulo: string;
  descricao: string;
  finalidade: 'venda' | 'aluguel';
  tipo: 'casa' | 'apartamento';
  cidade: string;
  bairro: string;
  condominio?: string;
  valor: number;
  area: number;
  dormitorios: number;
  suites: number;
  vagas: number;
  destaque: boolean;
  imagens: string[];
  caracteristicas?: string[];
  dataPublicacao?: string;
}

export interface PropertyFilters {
  finalidade?: 'venda' | 'aluguel';
  tipo?: 'casa' | 'apartamento';
  cidade?: string;
  bairro?: string;
  condominio?: string;
  valorMin?: number;
  valorMax?: number;
  dormitorios?: number;
  suites?: number;
  vagas?: number;
  destaque?: boolean;
}

export interface PropertySearchParams extends PropertyFilters {
  page?: number;
  limit?: number;
  ordenar?: 'recentes' | 'menor_preco' | 'maior_preco';
}
