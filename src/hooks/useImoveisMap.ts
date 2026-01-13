import { useQuery } from '@tanstack/react-query';
import { listarImoveis, ImoviewFilters, ImoviewProperty } from '@/services/imoviewApi';

/**
 * Hook para buscar todos os imóveis para exibição no mapa (sem paginação)
 * Usa paginação PARALELA em lotes para melhor performance
 */
export function useImoveisMap(filters: ImoviewFilters = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['imoveis-map', filters],
    queryFn: async () => {
      const PAGE_SIZE = 20; // Limite da API Imoview
      const MAX_PAGES = 100;
      const BATCH_SIZE = 10; // Requests paralelas por lote
      const allProperties: ImoviewProperty[] = [];
      const seenCodigos = new Set<number>();

      console.log('[useImoveisMap] Starting parallel fetch with filters:', filters);
      const startTime = Date.now();

      // 1. Primeira requisição para obter o total
      const firstResult = await listarImoveis({
        ...filters,
        limite: PAGE_SIZE,
        pagina: 1,
      });

      const totalQuantidade = firstResult.quantidade;
      console.log(`[useImoveisMap] Total quantity from API: ${totalQuantidade}`);

      // Adicionar imóveis da primeira página
      for (const property of firstResult.lista) {
        if (!seenCodigos.has(property.codigo)) {
          seenCodigos.add(property.codigo);
          allProperties.push(property);
        }
      }

      // Se só tem uma página, retornar
      if (firstResult.lista.length < PAGE_SIZE || (totalQuantidade && allProperties.length >= totalQuantidade)) {
        console.log(`[useImoveisMap] Only one page needed, returning ${allProperties.length} properties`);
        return allProperties;
      }

      // 2. Calcular páginas restantes
      const totalPages = Math.min(Math.ceil(totalQuantidade / PAGE_SIZE), MAX_PAGES);
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

      console.log(`[useImoveisMap] Fetching ${remainingPages.length} remaining pages in parallel batches of ${BATCH_SIZE}`);

      // 3. Buscar páginas restantes em lotes paralelos
      for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
        const batch = remainingPages.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (pagina) => {
            try {
              const result = await listarImoveis({
                ...filters,
                limite: PAGE_SIZE,
                pagina,
              });
              return result.lista;
            } catch (error) {
              console.error(`[useImoveisMap] Error fetching page ${pagina}:`, error);
              return [];
            }
          })
        );

        // Adicionar imóveis únicos de cada página do lote
        for (const pageProperties of batchResults) {
          for (const property of pageProperties) {
            if (!seenCodigos.has(property.codigo)) {
              seenCodigos.add(property.codigo);
              allProperties.push(property);
            }
          }
        }

        console.log(`[useImoveisMap] Batch ${Math.floor(i / BATCH_SIZE) + 1}: fetched pages ${batch[0]}-${batch[batch.length - 1]}, total so far: ${allProperties.length}`);

        // Parar se já temos todos
        if (totalQuantidade && allProperties.length >= totalQuantidade) {
          console.log(`[useImoveisMap] Reached total quantity, stopping early`);
          break;
        }
      }

      const duration = Date.now() - startTime;
      
      // Log statistics about coordinates
      const withCoords = allProperties.filter(p => 
        p.latitude && p.longitude && 
        p.latitude !== 0 && p.longitude !== 0
      );
      console.log(`[useImoveisMap] Final: ${allProperties.length} total, ${withCoords.length} with valid coordinates, took ${duration}ms`);

      return allProperties;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
