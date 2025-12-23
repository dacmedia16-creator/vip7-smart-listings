import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const PropertyCardSkeleton = React.forwardRef<HTMLDivElement>(
  (_, ref) => {
    return (
      <div ref={ref} className="rounded-xl overflow-hidden bg-card border border-border shadow-sm">
        {/* Image skeleton with shimmer effect */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        
        {/* Content skeleton */}
        <div className="p-4 space-y-4">
          {/* Badges */}
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          
          {/* Title - duas linhas */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
          
          {/* Location with icon */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          {/* Features icons */}
          <div className="flex gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-6" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-6" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-6" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
          
          {/* Price and button */}
          <div className="pt-3 flex items-center justify-between border-t border-border/50">
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
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
