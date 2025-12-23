import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ImoviewProperty } from '@/services/imoviewApi';

interface CachedGeocode {
  property_code: number;
  latitude: number | null;
  longitude: number | null;
  is_approximate: boolean;
  geocoded_address: string | null;
}

interface GeocodeResult {
  property_code: number;
  latitude: number | null;
  longitude: number | null;
  is_approximate: boolean;
  geocoded_address: string | null;
}

/**
 * Fetch cached geocodes for properties without coordinates
 */
export function usePropertyGeocodes(propertyCodes: number[]) {
  return useQuery({
    queryKey: ['property-geocodes', propertyCodes],
    queryFn: async () => {
      if (propertyCodes.length === 0) {
        return [];
      }

      const { data, error } = await supabase.functions.invoke('geocode-properties', {
        body: {
          action: 'get_cached',
          property_codes: propertyCodes,
        },
      });

      if (error) {
        console.error('[usePropertyGeocodes] Error fetching cached geocodes:', error);
        throw error;
      }

      return (data?.geocodes as CachedGeocode[]) || [];
    },
    enabled: propertyCodes.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Trigger geocoding for properties without coordinates
 */
export function useGeocodeProperties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (properties: Array<{
      codigo: number;
      endereco?: string;
      bairro?: string;
      cidade?: string;
      cep?: string;
    }>) => {
      if (properties.length === 0) {
        return { results: [], remaining: 0 };
      }

      console.log(`[useGeocodeProperties] Requesting geocode for ${properties.length} properties`);

      const { data, error } = await supabase.functions.invoke('geocode-properties', {
        body: {
          action: 'geocode',
          properties,
        },
      });

      if (error) {
        console.error('[useGeocodeProperties] Error geocoding:', error);
        throw error;
      }

      return data as { results: GeocodeResult[]; remaining: number };
    },
    onSuccess: (data) => {
      // Invalidate cached geocodes to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['property-geocodes'] });
      
      console.log(`[useGeocodeProperties] Geocoded ${data.results.length} properties, ${data.remaining} remaining`);
    },
  });
}

/**
 * Merge properties with geocoded coordinates
 * Returns properties with coordinates from API or from geocode cache
 */
export function mergePropertiesWithGeocodes(
  properties: ImoviewProperty[],
  geocodes: CachedGeocode[]
): {
  withCoords: ImoviewProperty[];
  withApproximateCoords: ImoviewProperty[];
  withoutCoords: ImoviewProperty[];
  totalWithLocation: number;
  totalWithoutLocation: number;
} {
  const geocodeMap = new Map(geocodes.map(g => [g.property_code, g]));
  
  const withCoords: ImoviewProperty[] = [];
  const withApproximateCoords: ImoviewProperty[] = [];
  const withoutCoords: ImoviewProperty[] = [];

  for (const property of properties) {
    const hasValidApiCoords = 
      property.latitude && 
      property.longitude && 
      property.latitude !== 0 && 
      property.longitude !== 0 &&
      Math.abs(property.latitude) <= 90 && 
      Math.abs(property.longitude) <= 180;

    if (hasValidApiCoords) {
      withCoords.push(property);
    } else {
      // Check if we have cached geocode
      const geocode = geocodeMap.get(property.codigo);
      
      if (geocode?.latitude && geocode?.longitude) {
        // Add geocoded coordinates to property
        const propertyWithGeocode = {
          ...property,
          latitude: geocode.latitude,
          longitude: geocode.longitude,
          _isGeocoded: true,
          _isApproximate: geocode.is_approximate,
          _geocodedAddress: geocode.geocoded_address,
        };
        
        if (geocode.is_approximate) {
          withApproximateCoords.push(propertyWithGeocode);
        } else {
          withCoords.push(propertyWithGeocode);
        }
      } else {
        withoutCoords.push(property);
      }
    }
  }

  return {
    withCoords,
    withApproximateCoords,
    withoutCoords,
    totalWithLocation: withCoords.length + withApproximateCoords.length,
    totalWithoutLocation: withoutCoords.length,
  };
}
