import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const PropertyCardSkeleton = React.forwardRef<HTMLDivElement>(
  (_, ref) => {
    return (
      <div ref={ref} className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm h-full">
        {/* Image skeleton with shimmer effect */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          {/* Badge skeletons */}
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          
          {/* Price skeleton at bottom */}
          <div className="absolute bottom-4 left-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="p-5 space-y-4">
          {/* Title - duas linhas */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          
          {/* Location with icon */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          {/* Features icons */}
          <div className="flex gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
          
          {/* CTA Button skeleton */}
          <div className="pt-2">
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }
);
PropertyCardSkeleton.displayName = 'PropertyCardSkeleton';

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {/* Loading indicator with pulse */}
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </div>
        <span className="text-sm font-medium">Buscando imóveis disponíveis...</span>
      </div>
      
      {/* Skeleton grid with staggered animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="opacity-0 animate-fade-in"
            style={{ 
              animationDelay: `${i * 100}ms`,
              animationFillMode: 'forwards'
            }}
          >
            <PropertyCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

// Map skeleton for map view loading
export function MapSkeleton() {
  return (
    <div className="w-full h-full min-h-[400px] bg-muted rounded-xl overflow-hidden relative">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="relative flex h-4 w-4 mx-auto mb-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
          </div>
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    </div>
  );
}

// Gallery skeleton for property detail page
export function GallerySkeleton() {
  return (
    <div className="relative h-[55vh] md:h-[75vh] bg-muted overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      {/* Thumbnails skeleton */}
      <div className="absolute bottom-6 left-6 right-6 flex gap-2 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="flex-shrink-0 w-14 h-10 md:w-20 md:h-14 rounded-lg" />
        ))}
      </div>
      
      {/* Counter skeleton */}
      <div className="absolute top-6 right-6">
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

// Filter skeleton for search page
export function FilterPanelSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
      
      {/* Filter groups */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      
      {/* Price range */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      
      {/* Apply button */}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
