import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mapbox public token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFjbWVkaWExNiIsImEiOiJjbWpnZXFyanUwcnd2M2RvbjFwbjlqcWhvIn0.t5x9PadkXW-3tX-zSdvJ-g';

// VIP7 Imóveis coordinates (Rua Horacio Cenci, 9 - Parque Campolim, Sorocaba - SP, 18047-800)
const VIP7_COORDS = {
  lat: -23.4894,
  lng: -47.4516
};

const VIP7_ADDRESS = 'Rua Horacio Cenci, 9 - Parque Campolim, Sorocaba - SP, 18047-800';

export function ContactMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [VIP7_COORDS.lng, VIP7_COORDS.lat],
      zoom: 16,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Create custom marker element
    const markerEl = document.createElement('div');
    markerEl.innerHTML = `
      <div class="relative">
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shadow-lg">
          VIP7 Imóveis
          <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-primary"></div>
        </div>
        <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-primary/20 rounded-full animate-ping"></div>
      </div>
    `;
    markerEl.className = 'cursor-pointer';

    // Add marker
    new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
      .setLngLat([VIP7_COORDS.lng, VIP7_COORDS.lat])
      .addTo(map.current);

    // Add 3D buildings on style load
    map.current.on('style.load', () => {
      if (!map.current) return;
      
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.current.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${VIP7_COORDS.lat},${VIP7_COORDS.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="relative rounded-xl border border-border overflow-hidden">
      <div ref={mapContainer} className="h-64 w-full" />
      <div className="absolute bottom-4 right-4">
        <Button
          onClick={handleDirections}
          variant="gold"
          size="sm"
          className="shadow-lg"
        >
          <Navigation className="h-4 w-4 mr-2" />
          Como chegar
        </Button>
      </div>
    </div>
  );
}
