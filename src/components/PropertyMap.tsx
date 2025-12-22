import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ImoviewProperty } from '@/services/imoviewApi';
import { formatPropertyValue } from '@/services/imoviewApi';
import { useNavigate } from 'react-router-dom';

// Mapbox public token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFjbWVkaWExNiIsImEiOiJjbWpnZXFyanUwcnd2M2RvbjFwbjlqcWhvIn0.t5x9PadkXW-3tX-zSdvJ-g';

interface PropertyMapProps {
  properties: ImoviewProperty[];
  isLoading?: boolean;
}

export function PropertyMap({ properties, isLoading }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const navigate = useNavigate();

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
    };
  }, [navigate]);

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
        transition: transform 0.2s ease;
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
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 1000,
      });
    }
  }, [propertiesWithCoords, createPopupContent]);

  return (
    <div className="relative w-full h-[600px] lg:h-[700px] rounded-xl overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Properties count overlay */}
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-border shadow-lg">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-primary">{propertiesWithCoords.length}</span>
          <span className="text-muted-foreground"> de {properties.length} imóveis no mapa</span>
        </p>
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
