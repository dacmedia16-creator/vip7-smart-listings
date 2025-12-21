import { Skeleton } from '@/components/ui/skeleton';

export function PropertyCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border">
      {/* Image skeleton */}
      <Skeleton className="aspect-[4/3] w-full" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Badge */}
        <Skeleton className="h-5 w-16 rounded-full" />
        
        {/* Title */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Location */}
        <Skeleton className="h-4 w-1/2" />
        
        {/* Features */}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
        
        {/* Price */}
        <div className="pt-2 flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {/* Loading message */}
      <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
        <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
        <span className="text-sm">Buscando imóveis...</span>
      </div>
      
      {/* Skeleton grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <PropertyCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
