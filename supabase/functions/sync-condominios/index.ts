import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IMOVIEW_API_KEY = Deno.env.get('IMOVIEW_API_KEY');
const IMOVIEW_API_URL = 'https://api.imoview.com.br';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Condominio {
  codigo: number;
  nome: string;
  cidade: string;
  cidade_codigo: number;
  finalidade: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[sync-condominios] Starting sync...');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch all cities
    console.log('[sync-condominios] Fetching cities...');
    const cidadesResponse = await fetch(`${IMOVIEW_API_URL}/Imovel/RetornarCidadesDisponiveis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'chave': IMOVIEW_API_KEY || '',
      },
      body: JSON.stringify({}),
    });

    if (!cidadesResponse.ok) {
      throw new Error(`Failed to fetch cities: ${cidadesResponse.status}`);
    }

    const cidadesData = await cidadesResponse.json();
    const cidades = Array.isArray(cidadesData) ? cidadesData : cidadesData?.lista || [];
    console.log(`[sync-condominios] Found ${cidades.length} cities`);

    // 2. Fetch condominios for all cities in parallel batches
    const allCondominios: Condominio[] = [];
    const seenCodigos = new Set<number>();
    const PAGE_SIZE = 20;
    const BATCH_SIZE = 5; // Concurrent requests per batch
    const MAX_PAGES = 100;

    const fetchCondominiosForCity = async (cityCode: number, cityName: string): Promise<Condominio[]> => {
      const condominios: Condominio[] = [];
      
      // First, get page 1 to know total
      const firstPageResponse = await fetch(`${IMOVIEW_API_URL}/Imovel/RetornarCondominiosDisponiveis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'chave': IMOVIEW_API_KEY || '',
        },
        body: JSON.stringify({
          codigoCidade: cityCode,
          numeroPagina: 1,
          numeroRegistros: PAGE_SIZE,
        }),
      });

      if (!firstPageResponse.ok) {
        console.error(`[sync-condominios] Failed to fetch condominios for city ${cityName}: ${firstPageResponse.status}`);
        return [];
      }

      const firstPageData = await firstPageResponse.json();
      const firstPageList = Array.isArray(firstPageData) ? firstPageData : firstPageData?.lista || [];
      const totalQuantity = firstPageData?.quantidade || firstPageList.length;

      // Add first page condominios
      for (const cond of firstPageList) {
        const codigo = Number(cond.codigo);
        if (codigo && !seenCodigos.has(codigo)) {
          seenCodigos.add(codigo);
          condominios.push({
            codigo,
            nome: String(cond.nome || cond.nomecondominio || cond.descricao || '').trim(),
            cidade: cityName,
            cidade_codigo: cityCode,
            finalidade: null,
          });
        }
      }

      if (firstPageList.length < PAGE_SIZE) {
        return condominios;
      }

      // Calculate remaining pages
      const totalPages = Math.min(Math.ceil(totalQuantity / PAGE_SIZE), MAX_PAGES);
      
      if (totalPages <= 1) {
        return condominios;
      }

      // Fetch remaining pages in parallel batches
      const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      
      for (let i = 0; i < pageNumbers.length; i += BATCH_SIZE) {
        const batch = pageNumbers.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (page) => {
            try {
              const response = await fetch(`${IMOVIEW_API_URL}/Imovel/RetornarCondominiosDisponiveis`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'chave': IMOVIEW_API_KEY || '',
                },
                body: JSON.stringify({
                  codigoCidade: cityCode,
                  numeroPagina: page,
                  numeroRegistros: PAGE_SIZE,
                }),
              });

              if (!response.ok) return [];

              const data = await response.json();
              return Array.isArray(data) ? data : data?.lista || [];
            } catch (e) {
              console.error(`[sync-condominios] Error fetching page ${page} for city ${cityName}:`, e);
              return [];
            }
          })
        );

        for (const pageList of batchResults) {
          for (const cond of pageList) {
            const codigo = Number(cond.codigo);
            if (codigo && !seenCodigos.has(codigo)) {
              seenCodigos.add(codigo);
              condominios.push({
                codigo,
                nome: String(cond.nome || cond.nomecondominio || cond.descricao || '').trim(),
                cidade: cityName,
                cidade_codigo: cityCode,
                finalidade: null,
              });
            }
          }
        }
      }

      return condominios;
    };

    // Process cities in batches
    for (let i = 0; i < cidades.length; i += BATCH_SIZE) {
      const batch = cidades.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(async (cidade: Record<string, unknown>) => {
          const cityCode = cidade.codigo as number;
          const cityName = String(cidade.nome || cidade.cidade || cidade.descricao || '').trim();
          
          if (!cityCode || !cityName) return [];
          
          try {
            return await fetchCondominiosForCity(cityCode, cityName);
          } catch (e) {
            console.error(`[sync-condominios] Error processing city ${cityName}:`, e);
            return [];
          }
        })
      );

      for (const cityCondominios of results) {
        allCondominios.push(...cityCondominios);
      }

      console.log(`[sync-condominios] Processed ${Math.min(i + BATCH_SIZE, cidades.length)}/${cidades.length} cities, total condominios: ${allCondominios.length}`);
    }

    console.log(`[sync-condominios] Total unique condominios found: ${allCondominios.length}`);

    // 3. Upsert all condominios to database
    if (allCondominios.length > 0) {
      // Clear existing cache and insert new data
      const { error: deleteError } = await supabase
        .from('condominios_cache')
        .delete()
        .neq('codigo', 0); // Delete all rows

      if (deleteError) {
        console.error('[sync-condominios] Error clearing cache:', deleteError);
      }

      // Insert in batches of 100
      const INSERT_BATCH_SIZE = 100;
      for (let i = 0; i < allCondominios.length; i += INSERT_BATCH_SIZE) {
        const batch = allCondominios.slice(i, i + INSERT_BATCH_SIZE);
        
        const { error: insertError } = await supabase
          .from('condominios_cache')
          .insert(batch);

        if (insertError) {
          console.error(`[sync-condominios] Error inserting batch ${i / INSERT_BATCH_SIZE + 1}:`, insertError);
        }
      }

      console.log(`[sync-condominios] Inserted ${allCondominios.length} condominios to cache`);
    }

    const duration = Date.now() - startTime;
    console.log(`[sync-condominios] Sync completed in ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      totalCondominios: allCondominios.length,
      totalCities: cidades.length,
      durationMs: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync-condominios] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
