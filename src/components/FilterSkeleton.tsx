import { Skeleton } from '@/components/ui/skeleton';

export function FilterSelectSkeleton() {
  return (
    <Skeleton className="h-10 w-full rounded-md" />
  );
}

export function FilterSliderSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function FiltersSidebarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Finalidade */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <FilterSelectSkeleton />
      </div>
      
      {/* Tipo */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <FilterSelectSkeleton />
      </div>
      
      {/* Cidade */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <FilterSelectSkeleton />
      </div>
      
      {/* Bairros */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <FilterSelectSkeleton />
      </div>
      
      {/* Condomínios */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <FilterSelectSkeleton />
      </div>
      
      {/* Faixa de preço */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <FilterSliderSkeleton />
      </div>
    </div>
  );
}
