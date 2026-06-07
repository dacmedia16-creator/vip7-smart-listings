import { useQuery } from '@tanstack/react-query';
import { ImoviewCity, ImoviewPropertyType, listarCidades, listarTiposImoveis } from '@/services/imoveisDb';

interface FiltrosIniciaisResult {
  cidades: ImoviewCity[];
  tipos: ImoviewPropertyType[];
}

async function carregarFiltrosIniciais(finalidade?: number): Promise<FiltrosIniciaisResult> {
  const [cidades, tipos] = await Promise.all([
    listarCidades(finalidade),
    listarTiposImoveis(),
  ]);
  return { cidades, tipos };
}

export function useFiltrosIniciais(finalidade?: number) {
  return useQuery({
    queryKey: ['filtros-iniciais', finalidade],
    queryFn: () => carregarFiltrosIniciais(finalidade),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
