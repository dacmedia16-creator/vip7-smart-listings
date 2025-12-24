import { Link } from 'react-router-dom';
import { X, Scale, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompareContext } from '@/contexts/CompareContext';
import { formatPropertyValue } from '@/services/imoviewApi';
import { cn } from '@/lib/utils';

export function CompareDrawer() {
  const { compareList, removeFromCompare, clearCompare, count } = useCompareContext();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl animate-slide-up">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">
                Comparar Imóveis
              </h3>
              <p className="text-sm text-muted-foreground">
                {count}/3 selecionados
              </p>
            </div>
          </div>

          {/* Properties */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl">
            {compareList.map((property) => (
              <div
                key={property.codigo}
                className="relative flex items-center gap-2 bg-muted/50 rounded-lg p-2 pr-8"
              >
                <img
                  src={property.fotos?.[0]?.url || '/placeholder.svg'}
                  alt={property.titulo || 'Imóvel'}
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {property.titulo || `Cód. ${property.codigo}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPropertyValue(property.valor, property.finalidade === 1)}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCompare(property.codigo)}
                  className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompare}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
            <Button
              asChild
              size="sm"
              disabled={count < 2}
              className={cn(count < 2 && 'opacity-50 pointer-events-none')}
            >
              <Link to={`/comparar?codigos=${compareList.map((p) => p.codigo).join(',')}`}>
                Comparar
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
