import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ImoviewCity, ImoviewPropertyType } from '@/services/imoviewApi';

interface FiltrosIniciaisResult {
  cidades: ImoviewCity[];
  tipos: ImoviewPropertyType[];
}

async function carregarFiltrosIniciais(finalidade?: number): Promise<FiltrosIniciaisResult> {
  const { data, error } = await supabase.functions.invoke('imoview-api', {
    body: {
      action: 'carregarFiltrosIniciais',
      params: { finalidade },
    },
  });

  if (error) {
    console.error('[useFiltrosIniciais] Error:', error);
    throw error;
  }

  return {
    cidades: data?.cidades || [],
    tipos: data?.tipos || [],
  };
}

export function useFiltrosIniciais(finalidade?: number) {
  return useQuery({
    queryKey: ['filtros-iniciais', finalidade],
    queryFn: () => carregarFiltrosIniciais(finalidade),
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
