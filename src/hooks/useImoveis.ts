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
    queryFn: () => listarImoveis({ finalidade, destaque: true, limite: 8 }),
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

export function useCidades(finalidade?: number) {
  return useQuery({
    queryKey: ['cidades', finalidade],
    queryFn: () => listarCidades(finalidade),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useBairros(cidade?: string, finalidade?: number) {
  return useQuery({
    queryKey: ['bairros', cidade, finalidade],
    queryFn: () => listarBairros(cidade, finalidade),
    enabled: !!cidade,
    staleTime: 1000 * 60 * 30,
  });
}

export function useCondominios(cidade?: string, finalidade?: number) {
  return useQuery({
    queryKey: ['condominios', cidade, finalidade],
    queryFn: () => listarCondominios(cidade, finalidade),
    enabled: !!cidade, // Só buscar condomínios quando uma cidade estiver selecionada
    staleTime: 1000 * 60 * 30,
  });
}

export function useTiposImoveis() {
  return useQuery({
    queryKey: ['tipos-imoveis'],
    queryFn: () => listarTiposImoveis(),
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}
