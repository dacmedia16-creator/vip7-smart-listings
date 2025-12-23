import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyToGeocode {
  codigo: number;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
}

interface GeocodeResult {
  property_code: number;
  latitude: number | null;
  longitude: number | null;
  is_approximate: boolean;
  geocoded_address: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, properties, property_codes } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Action: Get cached geocodes for property codes
    if (action === 'get_cached') {
      console.log(`[geocode-properties] Getting cached geocodes for ${property_codes?.length || 0} properties`);
      
      if (!property_codes || property_codes.length === 0) {
        return new Response(JSON.stringify({ geocodes: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('property_geocodes')
        .select('property_code, latitude, longitude, is_approximate, geocoded_address')
        .in('property_code', property_codes);

      if (error) {
        console.error('[geocode-properties] Error fetching cached geocodes:', error);
        throw error;
      }

      console.log(`[geocode-properties] Found ${data?.length || 0} cached geocodes`);
      
      return new Response(JSON.stringify({ geocodes: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Geocode properties and cache results
    if (action === 'geocode') {
      if (!mapboxToken) {
        console.error('[geocode-properties] MAPBOX_ACCESS_TOKEN not configured');
        return new Response(JSON.stringify({ 
          error: 'Mapbox token not configured',
          results: [] 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!properties || properties.length === 0) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Limit batch size to avoid rate limits
      const BATCH_SIZE = 10;
      const batch = (properties as PropertyToGeocode[]).slice(0, BATCH_SIZE);
      
      console.log(`[geocode-properties] Geocoding ${batch.length} properties (of ${properties.length} requested)`);

      const results: GeocodeResult[] = [];

      for (const property of batch) {
        // Build address string
        const addressParts: string[] = [];
        if (property.endereco) addressParts.push(property.endereco);
        if (property.bairro) addressParts.push(property.bairro);
        if (property.cidade) addressParts.push(property.cidade);
        if (property.cep) addressParts.push(property.cep);
        addressParts.push('Brasil');

        const addressString = addressParts.join(', ');
        
        if (addressParts.length <= 1) {
          console.log(`[geocode-properties] Property ${property.codigo}: insufficient address data`);
          results.push({
            property_code: property.codigo,
            latitude: null,
            longitude: null,
            is_approximate: false,
            geocoded_address: null,
          });
          continue;
        }

        try {
          const encodedAddress = encodeURIComponent(addressString);
          const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=BR&limit=1`;
          
          console.log(`[geocode-properties] Property ${property.codigo}: geocoding "${addressString}"`);
          
          const response = await fetch(geocodeUrl);
          
          if (!response.ok) {
            console.error(`[geocode-properties] Mapbox error for ${property.codigo}:`, response.status);
            results.push({
              property_code: property.codigo,
              latitude: null,
              longitude: null,
              is_approximate: false,
              geocoded_address: null,
            });
            continue;
          }

          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const [lng, lat] = feature.center;
            
            // Check if result is approximate (neighborhood/city level vs street address)
            const placeType = feature.place_type?.[0] || '';
            const isApproximate = ['neighborhood', 'locality', 'place', 'region', 'country'].includes(placeType);
            
            console.log(`[geocode-properties] Property ${property.codigo}: found ${lat}, ${lng} (${placeType}, approximate: ${isApproximate})`);
            
            const result: GeocodeResult = {
              property_code: property.codigo,
              latitude: lat,
              longitude: lng,
              is_approximate: isApproximate,
              geocoded_address: feature.place_name || addressString,
            };
            
            results.push(result);
            
            // Save to cache
            const { error: upsertError } = await supabase
              .from('property_geocodes')
              .upsert({
                property_code: result.property_code,
                latitude: result.latitude,
                longitude: result.longitude,
                is_approximate: result.is_approximate,
                geocoded_address: result.geocoded_address,
                source: 'mapbox',
              }, {
                onConflict: 'property_code',
              });
            
            if (upsertError) {
              console.error(`[geocode-properties] Error saving geocode for ${property.codigo}:`, upsertError);
            }
          } else {
            console.log(`[geocode-properties] Property ${property.codigo}: no results found`);
            results.push({
              property_code: property.codigo,
              latitude: null,
              longitude: null,
              is_approximate: false,
              geocoded_address: null,
            });
          }

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`[geocode-properties] Error geocoding ${property.codigo}:`, error);
          results.push({
            property_code: property.codigo,
            latitude: null,
            longitude: null,
            is_approximate: false,
            geocoded_address: null,
          });
        }
      }

      console.log(`[geocode-properties] Completed: ${results.filter(r => r.latitude).length}/${results.length} successfully geocoded`);

      return new Response(JSON.stringify({ 
        results,
        remaining: properties.length - batch.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[geocode-properties] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
