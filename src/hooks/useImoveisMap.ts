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
      // IMPORTANTE: A API Imoview limita a 20 registros por página!
      const PAGE_SIZE = 20;
      const MAX_PAGES = 100; // Aumentado para cobrir todos os imóveis (20 * 100 = 2000)
      const allProperties: ImoviewProperty[] = [];
      const seenCodigos = new Set<number>();
      
      let pagina = 1;
      let totalQuantidade: number | undefined;

      console.log('[useImoveisMap] Starting fetch with filters:', filters);

      // Fetch all pages
      while (pagina <= MAX_PAGES) {
        const result = await listarImoveis({
          ...filters,
          limite: PAGE_SIZE,
          pagina,
        });

        if (totalQuantidade === undefined) {
          totalQuantidade = result.quantidade;
          console.log(`[useImoveisMap] Total quantity from API: ${totalQuantidade}`);
        }

        // Add unique properties
        for (const property of result.lista) {
          if (!seenCodigos.has(property.codigo)) {
            seenCodigos.add(property.codigo);
            allProperties.push(property);
          }
        }

        console.log(`[useImoveisMap] Page ${pagina}: fetched ${result.lista.length} items, total so far: ${allProperties.length}`);

        // Stop if we've fetched all or no more results
        if (result.lista.length < PAGE_SIZE) {
          console.log(`[useImoveisMap] Stopping: page returned less than ${PAGE_SIZE} items`);
          break;
        }
        if (totalQuantidade && allProperties.length >= totalQuantidade) {
          console.log(`[useImoveisMap] Stopping: reached total quantity ${totalQuantidade}`);
          break;
        }

        pagina++;
      }

      // Log statistics about coordinates
      const withCoords = allProperties.filter(p => 
        p.latitude && p.longitude && 
        p.latitude !== 0 && p.longitude !== 0
      );
      console.log(`[useImoveisMap] Final: ${allProperties.length} total, ${withCoords.length} with valid coordinates`);

      return allProperties;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
