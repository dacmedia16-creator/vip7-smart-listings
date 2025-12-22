import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { ImoviewProperty } from '@/services/imoviewApi';
import { formatPropertyValue } from '@/services/imoviewApi';
import { useNavigate } from 'react-router-dom';
import { Pencil, Square, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mapbox public token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFjbWVkaWExNiIsImEiOiJjbWpnZXFyanUwcnd2M2RvbjFwbjlqcWhvIn0.t5x9PadkXW-3tX-zSdvJ-g';

interface PropertyMapProps {
  properties: ImoviewProperty[];
  isLoading?: boolean;
  onAreaFilter?: (filteredProperties: ImoviewProperty[] | null) => void;
}

export function PropertyMap({ properties, isLoading, onAreaFilter }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const navigate = useNavigate();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle' | null>(null);
  const [hasArea, setHasArea] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);

  // Filter properties with valid coordinates
  const propertiesWithCoords = useMemo(() => {
    return properties.filter(
      (p) => p.latitude && p.longitude && 
             p.latitude !== 0 && p.longitude !== 0 &&
             Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180
    );
  }, [properties]);

  // Create popup HTML content
  const createPopupContent = useCallback((property: ImoviewProperty) => {
    const isRental = property.finalidade === 1;
    const price = formatPropertyValue(property.valor, isRental);
    const imageUrl = property.fotos?.[0]?.url || '/placeholder.svg';
    const finalidadeLabel = isRental ? 'Aluguel' : 'Venda';
    const finalidadeClass = isRental ? 'bg-blue-500' : 'bg-emerald-500';

    return `
      <div class="property-popup">
        <div class="popup-image-container">
          <img src="${imageUrl}" alt="${property.titulo || 'Imóvel'}" class="popup-image" />
          <span class="popup-badge ${finalidadeClass}">${finalidadeLabel}</span>
        </div>
        <div class="popup-content">
          <h3 class="popup-title">${property.titulo || 'Imóvel'}</h3>
          <p class="popup-location">${property.bairro || ''}${property.bairro && property.cidade ? ', ' : ''}${property.cidade || ''}</p>
          <div class="popup-features">
            ${property.qtdeQuartos ? `<span>${property.qtdeQuartos} quarto${property.qtdeQuartos > 1 ? 's' : ''}</span>` : ''}
            ${property.qtdeVagas ? `<span>${property.qtdeVagas} vaga${property.qtdeVagas > 1 ? 's' : ''}</span>` : ''}
            ${property.areaConstruida ? `<span>${property.areaConstruida}m²</span>` : ''}
          </div>
          <p class="popup-price">${price}</p>
          <button class="popup-button" data-property-id="${property.codigo}">Ver detalhes</button>
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

  // Update markers visibility based on filter
  const updateMarkersVisibility = useCallback((filteredIds: Set<number> | null) => {
    markersRef.current.forEach((marker, index) => {
      const property = propertiesWithCoords[index];
      if (!property) return;
      
      const el = marker.getElement();
      if (filteredIds === null) {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      } else if (filteredIds.has(property.codigo)) {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      } else {
        el.style.opacity = '0.25';
        el.style.pointerEvents = 'none';
      }
    });
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
      const filteredIds = new Set(filtered.map(p => p.codigo));
      
      setFilteredCount(filtered.length);
      setHasArea(true);
      setIsDrawing(false);
      setDrawMode(null);
      updateMarkersVisibility(filteredIds);
      onAreaFilter?.(filtered);
    }
  }, [filterPropertiesByPolygon, updateMarkersVisibility, onAreaFilter]);

  const handleDrawUpdate = useCallback((e: any) => {
    const data = draw.current?.getAll();
    if (!data?.features?.length) return;

    const feature = data.features[0];
    if (feature.geometry.type === 'Polygon') {
      const filtered = filterPropertiesByPolygon(feature as Feature<Polygon>);
      const filteredIds = new Set(filtered.map(p => p.codigo));
      
      setFilteredCount(filtered.length);
      updateMarkersVisibility(filteredIds);
      onAreaFilter?.(filtered);
    }
  }, [filterPropertiesByPolygon, updateMarkersVisibility, onAreaFilter]);

  const handleDrawDelete = useCallback(() => {
    setHasArea(false);
    setFilteredCount(null);
    setIsDrawing(false);
    setDrawMode(null);
    updateMarkersVisibility(null);
    onAreaFilter?.(null);
  }, [updateMarkersVisibility, onAreaFilter]);

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

    return () => {
      map.current?.remove();
      map.current = null;
      draw.current = null;
    };
  }, [navigate, handleDrawCreate, handleDrawUpdate, handleDrawDelete]);

  // Update markers when properties change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Close any open popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    if (propertiesWithCoords.length === 0) return;

    // Create new markers
    const bounds = new mapboxgl.LngLatBounds();

    propertiesWithCoords.forEach((property) => {
      const isRental = property.finalidade === 1;
      const color = isRental ? '#3b82f6' : '#10b981'; // blue for rental, green for sale

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'property-marker';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.2s ease, opacity 0.3s ease;
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px',
        className: 'property-map-popup',
      }).setHTML(createPopupContent(property));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([property.longitude!, property.latitude!])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      bounds.extend([property.longitude!, property.latitude!]);
    });

    // Fit map to show all markers
    if (propertiesWithCoords.length > 0) {
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 1000,
      });
    }
  }, [propertiesWithCoords, createPopupContent]);

  // Handle drawing mode changes
  const startDrawPolygon = () => {
    if (!draw.current) return;
    draw.current.deleteAll();
    draw.current.changeMode('draw_polygon');
    setIsDrawing(true);
    setDrawMode('polygon');
    setHasArea(false);
    setFilteredCount(null);
    updateMarkersVisibility(null);
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
    updateMarkersVisibility(null);
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
        {/* Properties count */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-border shadow-lg">
          {hasArea && filteredCount !== null ? (
            <p className="text-sm text-foreground">
              <span className="font-semibold text-primary">{filteredCount}</span>
              <span className="text-muted-foreground"> de {propertiesWithCoords.length} imóveis na área</span>
            </p>
          ) : (
            <p className="text-sm text-foreground">
              <span className="font-semibold text-primary">{propertiesWithCoords.length}</span>
              <span className="text-muted-foreground"> de {properties.length} imóveis no mapa</span>
            </p>
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
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Venda</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Aluguel</span>
          </div>
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

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="flex items-center gap-3 bg-card px-6 py-4 rounded-lg border border-border shadow-lg">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-foreground">Carregando mapa...</span>
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
