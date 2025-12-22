import { useQuery } from '@tanstack/react-query';
import { listarImoveis, ImoviewFilters, ImoviewProperty } from '@/services/imoviewApi';

/**
 * Hook para buscar todos os imóveis para exibição no mapa (sem paginação)
 * Busca todas as páginas automaticamente para ter todos os pins no mapa
 */
export function useImoveisMap(filters: ImoviewFilters = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['imoveis-map', filters],
    queryFn: async () => {
      const PAGE_SIZE = 50;
      const MAX_PAGES = 20; // Limit to prevent too many requests
      const allProperties: ImoviewProperty[] = [];
      const seenCodigos = new Set<number>();
      
      let pagina = 1;
      let totalQuantidade: number | undefined;

      // Fetch all pages
      while (pagina <= MAX_PAGES) {
        const result = await listarImoveis({
          ...filters,
          limite: PAGE_SIZE,
          pagina,
        });

        if (totalQuantidade === undefined) {
          totalQuantidade = result.quantidade;
        }

        // Add unique properties
        for (const property of result.lista) {
          if (!seenCodigos.has(property.codigo)) {
            seenCodigos.add(property.codigo);
            allProperties.push(property);
          }
        }

        // Stop if we've fetched all or no more results
        if (result.lista.length < PAGE_SIZE) break;
        if (totalQuantidade && allProperties.length >= totalQuantidade) break;

        pagina++;
      }

      return allProperties;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
