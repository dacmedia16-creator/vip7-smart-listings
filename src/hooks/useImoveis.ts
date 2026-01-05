import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

// Cache inteligente: mantém dados por filtro, invalida automaticamente quando filtros mudam
const IMOVEIS_CACHE_CONFIG = {
  staleTime: 1000 * 60 * 5, // 5 minutos - dados considerados frescos (otimizado)
  gcTime: 1000 * 60 * 60, // 60 minutos - manter em cache para voltar a filtros anteriores
  refetchOnWindowFocus: false, // Não refetch ao focar janela
};

export function useImoveis(filters: ImoviewFilters = {}) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['imoveis', filters],
    queryFn: () => listarImoveis(filters),
    ...IMOVEIS_CACHE_CONFIG,
    // Mostra dados anteriores enquanto carrega novos (transição suave)
    placeholderData: (previousData) => previousData,
  });

  // Prefetch da próxima página para paginação instantânea
  useEffect(() => {
    if (query.data && query.data.quantidade > 0) {
      const limite = filters.limite || 20;
      const paginaAtual = filters.pagina || 1;
      const totalPaginas = Math.ceil(query.data.quantidade / limite);
      
      // Se há próxima página, prefetch ela
      if (paginaAtual < totalPaginas) {
        const nextPageFilters = { ...filters, pagina: paginaAtual + 1 };
        queryClient.prefetchQuery({
          queryKey: ['imoveis', nextPageFilters],
          queryFn: () => listarImoveis(nextPageFilters),
          ...IMOVEIS_CACHE_CONFIG,
        });
      }
    }
  }, [query.data, filters, queryClient]);

  return query;
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

// Cache configuration for filter data (rarely changes) - OTIMIZADO
const FILTER_CACHE_CONFIG = {
  staleTime: 1000 * 60 * 60 * 2, // 2 horas - dados considerados frescos
  gcTime: 1000 * 60 * 60 * 48, // 48 horas - manter em cache
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

export function useBairros(cidade?: string, codigoCidade?: number, finalidade?: number) {
  return useQuery({
    queryKey: ['bairros', cidade, codigoCidade, finalidade],
    queryFn: () => listarBairros(cidade, codigoCidade, finalidade),
    enabled: !!cidade || !!codigoCidade, // Precisa de cidade ou código
    ...FILTER_CACHE_CONFIG,
  });
}

// Versão para múltiplas cidades
export function useBairrosMultiCidade(
  cidades?: string[],
  codigosCidades?: number[],
  finalidade?: number
) {
  return useQuery({
    queryKey: ['bairros-multi', cidades, codigosCidades, finalidade],
    queryFn: async () => {
      if (!codigosCidades || codigosCidades.length === 0) {
        // Fallback: buscar por nomes
        if (!cidades || cidades.length === 0) return [];
        const results = await Promise.all(
          cidades.map(cidade => listarBairros(cidade, undefined, finalidade))
        );
        // Combinar e remover duplicatas por código
        const seen = new Set<number>();
        const combined: { codigo: number; nome: string; cidade?: string }[] = [];
        for (const bairros of results) {
          for (const b of bairros) {
            if (!seen.has(b.codigo)) {
              seen.add(b.codigo);
              combined.push(b);
            }
          }
        }
        return combined.sort((a, b) => a.nome.localeCompare(b.nome));
      }
      // Buscar por códigos de cidade em paralelo
      const results = await Promise.all(
        codigosCidades.map(codigo => listarBairros(undefined, codigo, finalidade))
      );
      // Combinar e remover duplicatas por código
      const seen = new Set<number>();
      const combined: { codigo: number; nome: string; cidade?: string }[] = [];
      for (const bairros of results) {
        for (const b of bairros) {
          if (!seen.has(b.codigo)) {
            seen.add(b.codigo);
            combined.push(b);
          }
        }
      }
      return combined.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: (cidades && cidades.length > 0) || (codigosCidades && codigosCidades.length > 0),
    ...FILTER_CACHE_CONFIG,
  });
}

// Cache especial para condomínios - mais agressivo pois são muitos dados
const CONDOMINIOS_CACHE_CONFIG = {
  staleTime: 1000 * 60 * 60 * 2, // 2 horas - dados considerados frescos
  gcTime: 1000 * 60 * 60 * 24, // 24 horas - manter em cache por muito tempo
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

export function useCondominios(cidade?: string, finalidade?: number) {
  return useQuery({
    queryKey: ['condominios', cidade, finalidade],
    queryFn: () => listarCondominios(cidade, finalidade),
    ...CONDOMINIOS_CACHE_CONFIG,
  });
}

// Versão slim dos condomínios - carrega apenas codigo, nome e cidade (muito mais rápido)
interface CondominioSlim {
  codigo: number;
  nome: string;
  cidade: string;
}

async function listarCondominiosSlim(cidade?: string, codigoCidade?: number, finalidade?: number): Promise<CondominioSlim[]> {
  const { data, error } = await supabase.functions.invoke('imoview-api', {
    body: {
      action: 'listarCondominiosSlim',
      params: { cidade, codigoCidade, finalidade },
    },
  });

  if (error) {
    console.error('[useCondominiosSlim] Error:', error);
    throw error;
  }

  return data || [];
}

export function useCondominiosSlim(cidade?: string, codigoCidade?: number, finalidade?: number) {
  return useQuery({
    queryKey: ['condominios-slim', cidade, codigoCidade, finalidade],
    queryFn: () => listarCondominiosSlim(cidade, codigoCidade, finalidade),
    ...FILTER_CACHE_CONFIG,
  });
}

// Versão para múltiplas cidades
export function useCondominiosSlimMultiCidade(
  cidades?: string[],
  codigosCidades?: number[],
  finalidade?: number
) {
  return useQuery({
    queryKey: ['condominios-slim-multi', cidades, codigosCidades, finalidade],
    queryFn: async () => {
      // Se não há cidades selecionadas, buscar TODOS os condomínios
      if (!codigosCidades || codigosCidades.length === 0) {
        if (!cidades || cidades.length === 0) {
          // Buscar sem filtro de cidade - retorna todos os condomínios
          return listarCondominiosSlim(undefined, undefined, finalidade);
        }
        // Fallback: buscar por nomes de cidades
        const results = await Promise.all(
          cidades.map(cidade => listarCondominiosSlim(cidade, undefined, finalidade))
        );
        // Combinar e remover duplicatas por código
        const seen = new Set<number>();
        const combined: CondominioSlim[] = [];
        for (const condominios of results) {
          for (const c of condominios) {
            if (!seen.has(c.codigo)) {
              seen.add(c.codigo);
              combined.push(c);
            }
          }
        }
        return combined.sort((a, b) => a.nome.localeCompare(b.nome));
      }
      // Buscar por códigos de cidade em paralelo
      const results = await Promise.all(
        codigosCidades.map(codigo => listarCondominiosSlim(undefined, codigo, finalidade))
      );
      // Combinar e remover duplicatas por código
      const seen = new Set<number>();
      const combined: CondominioSlim[] = [];
      for (const condominios of results) {
        for (const c of condominios) {
          if (!seen.has(c.codigo)) {
            seen.add(c.codigo);
            combined.push(c);
          }
        }
      }
      return combined.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    // Sempre habilitado - busca todos quando não há cidades selecionadas
    ...FILTER_CACHE_CONFIG,
  });
}

// Buscar condomínios que têm imóveis nos bairros selecionados
interface CondominioDoBairro {
  codigo: number;
  nome: string;
  cidade: string;
  quantidadeImoveis: number;
}

async function listarCondominiosPorBairro(
  codigosBairros: number[],
  codigoCidade?: number,
  finalidade?: number
): Promise<CondominioDoBairro[]> {
  const { data, error } = await supabase.functions.invoke('imoview-api', {
    body: {
      action: 'listarCondominiosPorBairro',
      params: { codigosBairros, codigoCidade, finalidade },
    },
  });

  if (error) {
    console.error('[useCondominiosPorBairro] Error:', error);
    throw error;
  }

  return data || [];
}

export function useCondominiosPorBairro(
  codigosBairros?: number[],
  codigoCidade?: number,
  finalidade?: number
) {
  return useQuery({
    queryKey: ['condominios-por-bairro', codigosBairros, codigoCidade, finalidade],
    queryFn: () => listarCondominiosPorBairro(codigosBairros!, codigoCidade, finalidade),
    enabled: !!codigosBairros && codigosBairros.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useTiposImoveis() {
  return useQuery({
    queryKey: ['tipos-imoveis'],
    queryFn: () => listarTiposImoveis(),
    ...FILTER_CACHE_CONFIG,
  });
}
