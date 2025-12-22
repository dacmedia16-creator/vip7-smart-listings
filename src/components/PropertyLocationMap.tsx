import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

// Mapbox public token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFjbWVkaWExNiIsImEiOiJjbWpnZXFyanUwcnd2M2RvbjFwbjlqcWhvIn0.t5x9PadkXW-3tX-zSdvJ-g';

interface PointOfInterest {
  name: string;
  type: string;
  distance: string;
  coordinates: [number, number];
  icon: string;
}

interface PropertyLocationMapProps {
  latitude: number;
  longitude: number;
  propertyTitle?: string;
  address?: string;
}

// POI categories and their icons/colors
const POI_CATEGORIES = [
  { type: 'school', label: 'Escolas', icon: '🏫', color: '#3b82f6' },
  { type: 'hospital', label: 'Hospitais', icon: '🏥', color: '#ef4444' },
  { type: 'supermarket', label: 'Mercados', icon: '🛒', color: '#22c55e' },
  { type: 'restaurant', label: 'Restaurantes', icon: '🍽️', color: '#f59e0b' },
  { type: 'bank', label: 'Bancos', icon: '🏦', color: '#6366f1' },
  { type: 'pharmacy', label: 'Farmácias', icon: '💊', color: '#ec4899' },
];

export function PropertyLocationMap({ 
  latitude, 
  longitude, 
  propertyTitle = 'Imóvel',
  address 
}: PropertyLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [isLoadingPois, setIsLoadingPois] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch nearby POIs
  useEffect(() => {
    const fetchPOIs = async () => {
      setIsLoadingPois(true);
      const allPois: PointOfInterest[] = [];

      try {
        // Use Mapbox Geocoding API to find nearby places
        for (const category of POI_CATEGORIES) {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${category.type}.json?proximity=${longitude},${latitude}&limit=3&access_token=${mapboxgl.accessToken}&language=pt`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            for (const feature of data.features || []) {
              const [lng, lat] = feature.center;
              const distance = calculateDistance(latitude, longitude, lat, lng);
              
              if (distance <= 2000) { // Within 2km
                allPois.push({
                  name: feature.text || feature.place_name,
                  type: category.type,
                  distance: formatDistance(distance),
                  coordinates: [lng, lat],
                  icon: category.icon,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching POIs:', error);
      }

      setPois(allPois);
      setIsLoadingPois(false);
    };

    fetchPOIs();
  }, [latitude, longitude]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom: 15,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add property marker
    const propertyEl = document.createElement('div');
    propertyEl.className = 'property-main-marker';
    propertyEl.innerHTML = `
      <div class="marker-pulse"></div>
      <div class="marker-pin">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    `;

    new mapboxgl.Marker({ element: propertyEl })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25, className: 'property-location-popup' })
          .setHTML(`
            <div class="location-popup-content">
              <h4>${propertyTitle}</h4>
              ${address ? `<p>${address}</p>` : ''}
            </div>
          `)
      )
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude, propertyTitle, address]);

  // Add POI markers when POIs are loaded
  useEffect(() => {
    if (!map.current || pois.length === 0) return;

    const markers: mapboxgl.Marker[] = [];

    pois.forEach((poi) => {
      const category = POI_CATEGORIES.find(c => c.type === poi.type);
      if (!category) return;

      // Filter by selected category
      if (selectedCategory && poi.type !== selectedCategory) return;

      const el = document.createElement('div');
      el.className = 'poi-marker';
      el.style.cssText = `
        width: 28px;
        height: 28px;
        background-color: ${category.color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s;
      `;
      el.innerHTML = poi.icon;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const popup = new mapboxgl.Popup({ 
        offset: 20, 
        className: 'poi-popup',
        closeButton: false 
      }).setHTML(`
        <div class="poi-popup-content">
          <span class="poi-icon">${poi.icon}</span>
          <div>
            <strong>${poi.name}</strong>
            <span class="poi-distance">${poi.distance}</span>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(poi.coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      markers.push(marker);
    });

    return () => {
      markers.forEach(m => m.remove());
    };
  }, [pois, selectedCategory]);

  // Calculate distance between two points in meters
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Format distance for display
  function formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  // Group POIs by category for display
  const groupedPois = POI_CATEGORIES.map(category => ({
    ...category,
    items: pois.filter(p => p.type === category.type),
  })).filter(group => group.items.length > 0);

  const handleOpenMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      '_blank'
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Localização
        </h2>
        <button
          onClick={handleOpenMaps}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Navigation className="h-4 w-4" />
          Como chegar
        </button>
      </div>

      {/* Map */}
      <div className="relative h-[400px] rounded-xl overflow-hidden border border-border">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Category Filter Pills */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-[calc(100%-100px)]">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-sm ${
              selectedCategory === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-card/90 text-foreground hover:bg-card'
            }`}
          >
            Todos
          </button>
          {POI_CATEGORIES.map((category) => (
            <button
              key={category.type}
              onClick={() => setSelectedCategory(
                selectedCategory === category.type ? null : category.type
              )}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-sm flex items-center gap-1 ${
                selectedCategory === category.type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/90 text-foreground hover:bg-card'
              }`}
            >
              <span>{category.icon}</span>
              <span className="hidden sm:inline">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* POIs List */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          Pontos de Interesse Próximos
          {isLoadingPois && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </h3>
        
        {groupedPois.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedPois.map((group) => (
              <div key={group.type} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <span>{group.icon}</span>
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.items.slice(0, 3).map((poi, index) => (
                    <li 
                      key={index} 
                      className="text-sm text-foreground flex items-center justify-between"
                    >
                      <span className="truncate">{poi.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {poi.distance}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : isLoadingPois ? (
          <p className="text-sm text-muted-foreground">Buscando pontos de interesse...</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum ponto de interesse encontrado nas proximidades.
          </p>
        )}
      </div>
    </div>
  );
}
