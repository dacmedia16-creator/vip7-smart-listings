import { useQuery } from '@tanstack/react-query';
import {
  listarImoveis,
  listarCidades,
  listarBairros,
  listarCondominios,
  listarTiposImoveis,
  detalhesImovel,
  ImoviewFilters,
  ImoviewProperty,
  ImoviewListResult,
} from '@/services/imoviewApi';

export function useImoveis(filters: ImoviewFilters = {}) {
  return useQuery({
    queryKey: ['imoveis', filters],
    queryFn: () => listarImoveis(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useImoveisDestaque(finalidade?: number) {
  return useQuery({
    queryKey: ['imoveis-destaque', finalidade],
    queryFn: async () => {
      const result = await listarImoveis({ finalidade, destaque: true, limite: 8 });
      return result.lista;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useImovelDetalhes(codigo: string | number | undefined) {
  return useQuery({
    queryKey: ['imovel', codigo],
    queryFn: () => detalhesImovel(codigo!),
    enabled: !!codigo,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// Cache configuration for filter data (rarely changes)
const FILTER_CACHE_CONFIG = {
  staleTime: 1000 * 60 * 60, // 1 hora - dados considerados frescos
  gcTime: 1000 * 60 * 60 * 24, // 24 horas - manter em cache
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

export function useCidades(finalidade?: number) {
  return useQuery({
    queryKey: ['cidades', finalidade],
    queryFn: () => listarCidades(finalidade),
    ...FILTER_CACHE_CONFIG,
  });
}

export function useBairros(cidade?: string, finalidade?: number) {
  return useQuery({
    queryKey: ['bairros', cidade, finalidade],
    queryFn: () => listarBairros(cidade, finalidade),
    enabled: !!cidade,
    ...FILTER_CACHE_CONFIG,
  });
}

export function useCondominios(cidade?: string, finalidade?: number) {
  return useQuery({
    queryKey: ['condominios', cidade, finalidade],
    queryFn: () => listarCondominios(cidade, finalidade),
    // Sempre habilitado - busca todos se não houver cidade
    ...FILTER_CACHE_CONFIG,
  });
}

export function useTiposImoveis() {
  return useQuery({
    queryKey: ['tipos-imoveis'],
    queryFn: () => listarTiposImoveis(),
    ...FILTER_CACHE_CONFIG,
  });
}
