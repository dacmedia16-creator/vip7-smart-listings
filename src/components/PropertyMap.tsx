import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import type { Feature, Polygon, FeatureCollection, Point } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { ImoviewProperty } from '@/services/imoviewApi';
import { formatPropertyValue } from '@/services/imoviewApi';
import { useNavigate } from 'react-router-dom';
import { Pencil, Square, Trash2, X, MapPin, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePropertyGeocodes, useGeocodeProperties, mergePropertiesWithGeocodes } from '@/hooks/usePropertyGeocodes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Mapbox public token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFjbWVkaWExNiIsImEiOiJjbWpnZXFyanUwcnd2M2RvbjFwbjlqcWhvIn0.t5x9PadkXW-3tX-zSdvJ-g';

interface PropertyMapProps {
  properties: ImoviewProperty[];
  isLoading?: boolean;
  onAreaFilter?: (filteredProperties: ImoviewProperty[] | null) => void;
}

interface PropertyFeatureProperties {
  codigo: number;
  finalidade: number;
  valor: number;
  titulo: string;
  bairro: string;
  cidade: string;
  qtdeQuartos: number;
  qtdeVagas: number;
  areaConstruida: number;
  fotoUrl: string;
  isApproximate: boolean;
  geocodedAddress?: string;
}

export function PropertyMap({ properties, isLoading, onAreaFilter }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const navigate = useNavigate();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle' | null>(null);
  const [hasArea, setHasArea] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [showApproximate, setShowApproximate] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Find properties without coordinates to geocode
  const propertiesWithoutCoords = useMemo(() => {
    return properties.filter(
      (p) => !p.latitude || !p.longitude || 
             p.latitude === 0 || p.longitude === 0 ||
             Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180
    );
  }, [properties]);

  // Fetch cached geocodes for properties without coords
  const { data: cachedGeocodes = [] } = usePropertyGeocodes(
    propertiesWithoutCoords.map(p => p.codigo)
  );

  // Geocode mutation for properties not yet cached
  const geocodeMutation = useGeocodeProperties();

  // Merge properties with geocoded coordinates
  const { withCoords, withApproximateCoords, withoutCoords, totalWithLocation, totalWithoutLocation } = useMemo(() => {
    return mergePropertiesWithGeocodes(properties, cachedGeocodes);
  }, [properties, cachedGeocodes]);

  // Trigger geocoding for uncached properties (background task)
  useEffect(() => {
    const uncachedCodes = new Set(cachedGeocodes.map(g => g.property_code));
    const toGeocode = propertiesWithoutCoords.filter(p => !uncachedCodes.has(p.codigo));
    
    if (toGeocode.length > 0 && !geocodeMutation.isPending) {
      console.log(`[PropertyMap] Triggering geocode for ${toGeocode.length} uncached properties`);
      geocodeMutation.mutate(toGeocode.map(p => ({
        codigo: p.codigo,
        endereco: p.endereco,
        bairro: p.bairro,
        cidade: p.cidade,
      })));
    }
  }, [propertiesWithoutCoords, cachedGeocodes, geocodeMutation]);

  // Validate coordinates are within Brazil bounds
  const isValidBrazilCoord = useCallback((lat: number, lng: number): boolean => {
    // Brazil approximate bounds: lat -35 to 5, lng -75 to -30
    return lat >= -35 && lat <= 5 && lng >= -75 && lng <= -30;
  }, []);

  // All properties to display on map (filtered for valid Brazil coordinates)
  const propertiesWithCoords = useMemo(() => {
    const allProps = showApproximate 
      ? [...withCoords, ...withApproximateCoords]
      : withCoords;
    
    // Filter for valid Brazil coordinates
    const validProps = allProps.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      const isValid = isValidBrazilCoord(p.latitude, p.longitude);
      if (!isValid) {
        console.warn(`[PropertyMap] Invalid coordinates for property ${p.codigo}: lat=${p.latitude}, lng=${p.longitude}`);
      }
      return isValid;
    });

    console.log(`[PropertyMap] Filtered ${allProps.length} -> ${validProps.length} properties with valid Brazil coords`);
    return validProps;
  }, [withCoords, withApproximateCoords, showApproximate, isValidBrazilCoord]);

  // Convert properties to GeoJSON for clustering
  const geojsonData = useMemo((): FeatureCollection<Point, PropertyFeatureProperties> => {
    return {
      type: 'FeatureCollection',
      features: propertiesWithCoords.map((property) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [property.longitude!, property.latitude!]
        },
        properties: {
          codigo: property.codigo,
          finalidade: property.finalidade,
          valor: property.valor || 0,
          titulo: property.titulo || 'Imóvel',
          bairro: property.bairro || '',
          cidade: property.cidade || '',
          qtdeQuartos: property.qtdeQuartos || 0,
          qtdeVagas: property.qtdeVagas || 0,
          areaConstruida: property.areaConstruida || 0,
          fotoUrl: property.fotos?.[0]?.url || '/placeholder.svg',
          isApproximate: (property as any)._isApproximate === true,
          geocodedAddress: (property as any)._geocodedAddress || '',
        }
      }))
    };
  }, [propertiesWithCoords]);

  // Create popup HTML content
  const createPopupContent = useCallback((props: PropertyFeatureProperties) => {
    const isRental = props.finalidade === 1;
    const price = formatPropertyValue(props.valor, isRental);
    const imageUrl = props.fotoUrl || '/placeholder.svg';
    const finalidadeLabel = isRental ? 'Aluguel' : 'Venda';
    const finalidadeClass = isRental ? 'bg-blue-500' : 'bg-emerald-500';

    return `
      <div class="property-popup">
        <div class="popup-image-container">
          <img src="${imageUrl}" alt="${props.titulo}" class="popup-image" />
          <span class="popup-badge ${finalidadeClass}">${finalidadeLabel}</span>
          ${props.isApproximate ? '<span class="popup-badge bg-amber-500" style="right: auto; left: 8px;">Loc. aproximada</span>' : ''}
        </div>
        <div class="popup-content">
          <h3 class="popup-title">${props.titulo}</h3>
          <p class="popup-location">${props.bairro}${props.bairro && props.cidade ? ', ' : ''}${props.cidade}</p>
          ${props.isApproximate && props.geocodedAddress ? `<p class="popup-location text-xs opacity-70">${props.geocodedAddress}</p>` : ''}
          <div class="popup-features">
            ${props.qtdeQuartos ? `<span>${props.qtdeQuartos} quarto${props.qtdeQuartos > 1 ? 's' : ''}</span>` : ''}
            ${props.qtdeVagas ? `<span>${props.qtdeVagas} vaga${props.qtdeVagas > 1 ? 's' : ''}</span>` : ''}
            ${props.areaConstruida ? `<span>${props.areaConstruida}m²</span>` : ''}
          </div>
          <p class="popup-price">${price}</p>
          <button class="popup-button" data-property-id="${props.codigo}">Ver detalhes</button>
        </div>
      </div>
    `;
  }, []);

  // Filter properties by polygon
  const filterPropertiesByPolygon = useCallback((polygon: Feature<Polygon>) => {
    const filtered = propertiesWithCoords.filter(property => {
      if (!property.latitude || !property.longitude) return false;
      const point = turf.point([property.longitude, property.latitude]);
      return turf.booleanPointInPolygon(point, polygon);
    });
    return filtered;
  }, [propertiesWithCoords]);

  // Handle draw events
  const handleDrawCreate = useCallback((e: any) => {
    const data = draw.current?.getAll();
    if (!data?.features?.length) return;

    // Keep only the latest polygon
    if (data.features.length > 1) {
      const lastFeature = data.features[data.features.length - 1];
      draw.current?.deleteAll();
      draw.current?.add(lastFeature);
    }

    const feature = data.features[data.features.length - 1];
    if (feature.geometry.type === 'Polygon') {
      const filtered = filterPropertiesByPolygon(feature as Feature<Polygon>);
      
      setFilteredCount(filtered.length);
      setHasArea(true);
      setIsDrawing(false);
      setDrawMode(null);
      onAreaFilter?.(filtered);
    }
  }, [filterPropertiesByPolygon, onAreaFilter]);

  const handleDrawUpdate = useCallback((e: any) => {
    const data = draw.current?.getAll();
    if (!data?.features?.length) return;

    const feature = data.features[0];
    if (feature.geometry.type === 'Polygon') {
      const filtered = filterPropertiesByPolygon(feature as Feature<Polygon>);
      
      setFilteredCount(filtered.length);
      onAreaFilter?.(filtered);
    }
  }, [filterPropertiesByPolygon, onAreaFilter]);

  const handleDrawDelete = useCallback(() => {
    setHasArea(false);
    setFilteredCount(null);
    setIsDrawing(false);
    setDrawMode(null);
    onAreaFilter?.(null);
  }, [onAreaFilter]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-47.4526, -23.5015], // Sorocaba/SP
      zoom: 12,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Initialize MapboxDraw
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#d4a853',
            'fill-outline-color': '#d4a853',
            'fill-opacity': 0.15
          }
        },
        // Polygon stroke
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#d4a853',
            'line-dasharray': [0.2, 2],
            'line-width': 3
          }
        },
        // Vertex points
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#fff',
            'circle-stroke-color': '#d4a853',
            'circle-stroke-width': 2
          }
        },
        // Midpoints
        {
          id: 'gl-draw-polygon-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#d4a853'
          }
        }
      ]
    });

    map.current.addControl(draw.current as any);

    // Draw event listeners
    map.current.on('draw.create', handleDrawCreate);
    map.current.on('draw.update', handleDrawUpdate);
    map.current.on('draw.delete', handleDrawDelete);

    // Handle popup button clicks
    map.current.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.classList.contains('popup-button')) {
        const propertyId = target.getAttribute('data-property-id');
        if (propertyId) {
          navigate(`/imoveis/${propertyId}`);
        }
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      draw.current = null;
    };
  }, [navigate, handleDrawCreate, handleDrawUpdate, handleDrawDelete]);

  // Setup clustering layers when map loads
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;

    // Add source for clustered properties
    if (!mapInstance.getSource('properties')) {
      mapInstance.addSource('properties', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 60,
        clusterProperties: {
          // Aggregate properties for cluster display
          hasRental: ['any', ['==', ['get', 'finalidade'], 1]],
          hasSale: ['any', ['==', ['get', 'finalidade'], 2]],
        }
      });

      // Cluster circles layer
      mapInstance.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#d4a853',  // Small clusters (< 10) - gold
            10,
            '#f59e0b', // Medium clusters (10-30) - amber
            30,
            '#ea580c', // Large clusters (30-100) - orange
            100,
            '#dc2626'  // Very large clusters (100+) - red
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,  // Small clusters
            10,
            25,  // Medium
            30,
            32,  // Large
            100,
            40   // Very large
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Cluster count text layer
      mapInstance.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Individual property points - Sale (green)
      mapInstance.addLayer({
        id: 'unclustered-point-sale',
        type: 'circle',
        source: 'properties',
        filter: ['all', 
          ['!', ['has', 'point_count']], 
          ['==', ['get', 'finalidade'], 2]
        ],
        paint: {
          'circle-color': '#10b981',
          'circle-radius': 10,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Individual property points - Rental (blue)
      mapInstance.addLayer({
        id: 'unclustered-point-rental',
        type: 'circle',
        source: 'properties',
        filter: ['all', 
          ['!', ['has', 'point_count']], 
          ['==', ['get', 'finalidade'], 1]
        ],
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': 10,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Approximate location indicator (dashed ring)
      mapInstance.addLayer({
        id: 'approximate-ring',
        type: 'circle',
        source: 'properties',
        filter: ['all', 
          ['!', ['has', 'point_count']], 
          ['==', ['get', 'isApproximate'], true]
        ],
        paint: {
          'circle-color': 'transparent',
          'circle-radius': 14,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f59e0b',
          'circle-stroke-opacity': 0.8
        }
      });

      // Click on cluster to zoom
      mapInstance.on('click', 'clusters', (e) => {
        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        
        if (!features.length) return;
        
        const clusterId = features[0].properties?.cluster_id;
        const source = mapInstance.getSource('properties') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          
          const geometry = features[0].geometry;
          if (geometry.type === 'Point') {
            mapInstance.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoom || 14,
              duration: 500
            });
          }
        });
      });

      // Click on individual property to show popup
      const showPopup = (e: mapboxgl.MapLayerMouseEvent) => {
        const features = e.features;
        if (!features?.length) return;

        const feature = features[0];
        const geometry = feature.geometry;
        if (geometry.type !== 'Point') return;

        const coordinates = geometry.coordinates.slice() as [number, number];
        const props = feature.properties as PropertyFeatureProperties;

        // Close existing popup
        if (popupRef.current) {
          popupRef.current.remove();
        }

        popupRef.current = new mapboxgl.Popup({
          offset: 15,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px',
          className: 'property-map-popup',
        })
          .setLngLat(coordinates)
          .setHTML(createPopupContent(props))
          .addTo(mapInstance);
      };

      mapInstance.on('click', 'unclustered-point-sale', showPopup);
      mapInstance.on('click', 'unclustered-point-rental', showPopup);

      // Change cursor on hover
      mapInstance.on('mouseenter', 'clusters', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', 'clusters', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
      mapInstance.on('mouseenter', 'unclustered-point-sale', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', 'unclustered-point-sale', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
      mapInstance.on('mouseenter', 'unclustered-point-rental', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', 'unclustered-point-rental', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    }
  }, [mapLoaded, createPopupContent]);

  // Update GeoJSON data when properties change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('properties') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojsonData);

      // Fit bounds to show all properties
      if (propertiesWithCoords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        
        propertiesWithCoords.forEach((property) => {
          bounds.extend([property.longitude!, property.latitude!]);
        });

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        const boundsAreValid = 
          Math.abs(ne.lat - sw.lat) > 0.0001 || 
          Math.abs(ne.lng - sw.lng) > 0.0001;
        
        if (boundsAreValid) {
          map.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
            duration: 1000,
          });
        } else {
          map.current.flyTo({
            center: [ne.lng, ne.lat],
            zoom: 14,
            duration: 1000,
          });
        }
      }
    }
  }, [geojsonData, propertiesWithCoords, mapLoaded]);

  // Handle drawing mode changes
  const startDrawPolygon = () => {
    if (!draw.current) return;
    draw.current.deleteAll();
    draw.current.changeMode('draw_polygon');
    setIsDrawing(true);
    setDrawMode('polygon');
    setHasArea(false);
    setFilteredCount(null);
    onAreaFilter?.(null);
  };

  const startDrawRectangle = () => {
    if (!draw.current) return;
    draw.current.deleteAll();
    // MapboxDraw doesn't have a built-in rectangle mode, so we use polygon
    draw.current.changeMode('draw_polygon');
    setIsDrawing(true);
    setDrawMode('rectangle');
    setHasArea(false);
    setFilteredCount(null);
    onAreaFilter?.(null);
  };

  const clearArea = () => {
    if (!draw.current) return;
    draw.current.deleteAll();
    handleDrawDelete();
  };

  const cancelDrawing = () => {
    if (!draw.current) return;
    draw.current.changeMode('simple_select');
    setIsDrawing(false);
    setDrawMode(null);
  };

  return (
    <div className="relative w-full h-[600px] lg:h-[700px] rounded-xl overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Drawing toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* Properties count with transparency info */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-border shadow-lg">
          {hasArea && filteredCount !== null ? (
            <p className="text-sm text-foreground">
              <span className="font-semibold text-primary">{filteredCount}</span>
              <span className="text-muted-foreground"> de {propertiesWithCoords.length} imóveis na área</span>
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-foreground">
                  <span className="font-semibold text-primary">{propertiesWithCoords.length}</span>
                  <span className="text-muted-foreground"> imóveis no mapa</span>
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">
                        O mapa exibe apenas imóveis com coordenadas de localização. 
                        {totalWithoutLocation > 0 && ` ${totalWithoutLocation} imóveis não possuem localização na fonte de dados.`}
                        {withApproximateCoords.length > 0 && ` ${withApproximateCoords.length} possuem localização aproximada.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Detailed breakdown */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {withCoords.length} com localização
                </span>
                {withApproximateCoords.length > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    {withApproximateCoords.length} aproximada
                    <button
                      onClick={() => setShowApproximate(!showApproximate)}
                      className="ml-1 text-primary hover:underline"
                    >
                      ({showApproximate ? 'ocultar' : 'mostrar'})
                    </button>
                  </span>
                )}
                {totalWithoutLocation > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    {totalWithoutLocation} sem localização
                  </span>
                )}
              </div>
              
              {/* Geocoding status with progress */}
              {geocodeMutation.isPending && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Buscando localizações...</span>
                  </div>
                  {propertiesWithoutCoords.length > 0 && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${Math.round((1 - (propertiesWithoutCoords.length - cachedGeocodes.length) / propertiesWithoutCoords.length) * 100)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Draw controls */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border shadow-lg">
          <div className="flex items-center gap-1">
            {!isDrawing ? (
              <>
                <Button
                  variant={hasArea ? "outline" : "secondary"}
                  size="sm"
                  onClick={startDrawPolygon}
                  className="gap-1.5"
                  title="Desenhar área livre"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Desenhar</span>
                </Button>
                <Button
                  variant={hasArea ? "outline" : "secondary"}
                  size="sm"
                  onClick={startDrawRectangle}
                  className="gap-1.5"
                  title="Desenhar retângulo"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Retângulo</span>
                </Button>
                {hasArea && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearArea}
                    className="gap-1.5"
                    title="Limpar área"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground px-2">
                  Clique no mapa para desenhar...
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelDrawing}
                  title="Cancelar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-3 border border-border shadow-lg">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Legenda</p>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              <span className="text-muted-foreground">Venda</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
              <span className="text-muted-foreground">Aluguel</span>
            </div>
          </div>
          {/* Cluster legend */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-[#d4a853] flex items-center justify-center text-[10px] text-white font-bold">5</div>
              <span className="text-muted-foreground text-xs">Agrupamento de imóveis</span>
            </div>
          </div>
          {withApproximateCoords.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <div className="relative flex items-center justify-center w-5 h-5">
                <div className="absolute w-4 h-4 rounded-full border-2 border-dashed border-amber-500 opacity-50" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-muted-foreground text-xs">Localização aproximada (bairro/CEP)</span>
            </div>
          )}
        </div>
      </div>

      {/* Drawing mode indicator */}
      {isDrawing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="bg-primary/90 text-primary-foreground px-6 py-3 rounded-full shadow-lg animate-pulse">
            <span className="text-sm font-medium">
              {drawMode === 'polygon' ? 'Clique para criar pontos, duplo-clique para finalizar' : 'Clique e arraste para criar área'}
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay with progress */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-muted rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <MapPin className="absolute inset-0 m-auto w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">Carregando imóveis no mapa...</p>
            <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
          </div>
        </div>
      )}

      {/* No coordinates message */}
      {!isLoading && propertiesWithCoords.length === 0 && properties.length > 0 && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center px-6 py-8">
            <p className="text-lg text-foreground mb-2">Nenhum imóvel com localização disponível</p>
            <p className="text-sm text-muted-foreground">
              Os imóveis selecionados não possuem coordenadas de GPS.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
