import * as React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BedDouble, Bath, Car, Maximize, ArrowRight, Repeat, Scale, Clock, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImoviewProperty, formatPropertyValue } from '@/services/imoviewApi';
import { useCompareContext } from '@/contexts/CompareContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PropertyCardProps {
  property: ImoviewProperty;
  /** Média de R$/m² do bairro, para exibir badge "Abaixo da média" */
  mediaPrecoM2Bairro?: number;
}

/**
 * Formata a data de atualização para exibição relativa
 * Ex: "há 2 horas", "há 3 dias"
 */
function formatUpdateTime(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
}

export const PropertyCard = React.forwardRef<HTMLAnchorElement, PropertyCardProps>(
  ({ property, mediaPrecoM2Bairro }, ref) => {
    const { isInCompare, toggleCompare, canAddMore } = useCompareContext();
    const isSelected = isInCompare(property.codigo);
    const isRental = property.finalidade === 1;
    const imageUrl = property.fotos?.[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';
    const updateTimeText = formatUpdateTime(property.dataAtualizacao);

    // Calcular R$/m² e verificar se está abaixo da média do bairro
    const precoM2Info = React.useMemo(() => {
      const area = property.areaTotal || property.areaConstruida || 0;
      if (area <= 0 || !property.valor) return null;
      const precoM2 = property.valor / area;
      const abaixoDaMedia = mediaPrecoM2Bairro != null && mediaPrecoM2Bairro > 0 && precoM2 < mediaPrecoM2Bairro;
      const percentAbaixo = abaixoDaMedia ? Math.round((1 - precoM2 / mediaPrecoM2Bairro) * 100) : 0;
      return { precoM2, abaixoDaMedia, percentAbaixo };
    }, [property.valor, property.areaTotal, property.areaConstruida, mediaPrecoM2Bairro]);

    const handleCompareClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCompare(property);
    };

    return (
      <Link
        ref={ref}
        to={`/imovel/${property.codigo}`}
        className="group block h-full"
      >
        <article className={cn(
          "card-luxury rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}>
          {/* Image Container */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={imageUrl}
              alt={property.titulo || 'Imóvel'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            
            {/* Top Badges */}
            <div className="absolute top-4 left-4 right-14 flex flex-col gap-2">
              {property.condominio && (
                <Badge className="bg-primary/90 text-primary-foreground border-none text-xs font-medium w-fit">
                  {property.condominio}
                </Badge>
              )}
              {precoM2Info?.abaixoDaMedia && precoM2Info.percentAbaixo >= 5 && (
                <Badge className="bg-accent/90 text-accent-foreground border-none text-xs font-medium flex items-center gap-1 w-fit">
                  <TrendingDown className="h-3 w-3" />
                  {precoM2Info.percentAbaixo}% abaixo do m² do bairro
                </Badge>
              )}
              {property.aceitaPermuta && (
                <Badge className="bg-emerald-600 text-white border-none text-xs font-medium flex items-center gap-1 w-fit">
                  <Repeat className="h-3 w-3" />
                  Aceita Permuta
                </Badge>
              )}
            </div>

            {/* Compare Button */}
            <div className="absolute top-4 right-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCompareClick}
                    disabled={!canAddMore && !isSelected}
                    className={cn(
                      "p-2 rounded-full transition-all duration-200",
                      isSelected 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "bg-background/80 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground",
                      !canAddMore && !isSelected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Scale className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSelected 
                    ? "Remover da comparação" 
                    : canAddMore 
                      ? "Adicionar à comparação" 
                      : "Limite de 3 imóveis atingido"}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Finalidade Badge */}
            <Badge className="absolute top-4 right-14 bg-background/80 backdrop-blur-sm text-foreground border-none text-xs uppercase tracking-wider">
              {isRental ? 'Locação' : 'Venda'}
            </Badge>

            {/* Price at bottom of image */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                {formatPropertyValue(property.valor, isRental)}
              </p>
              {isRental && (
                <span className="text-sm text-muted-foreground">/mês</span>
              )}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {property.valorCondominio !== undefined && property.valorCondominio > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cond: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(property.valorCondominio)}
                  </p>
                )}
                {precoM2Info && (
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(precoM2Info.precoM2)}/m²
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            {/* Title */}
            <h3 className="text-lg font-heading font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
              {property.titulo || property.tipoDescricao || 'Imóvel disponível'}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm truncate">
                {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
              </span>
            </div>

            {/* Update Time Indicator */}
            {updateTimeText && (
              <div className="flex items-center gap-1.5 text-muted-foreground/70 mb-3 text-xs">
                <Clock className="h-3 w-3" />
                <span>Atualizado {updateTimeText}</span>
              </div>
            )}

            {/* Features - Compact Icons */}
            <div className="flex items-center gap-4 text-muted-foreground mb-5 text-sm">
              {property.qtdeQuartos !== undefined && property.qtdeQuartos > 0 && (
                <div className="flex items-center gap-1.5" title="Quartos">
                  <BedDouble className="h-4 w-4 text-primary/70" />
                  <span>{property.qtdeQuartos}</span>
                </div>
              )}
              {property.qtdeSuites !== undefined && property.qtdeSuites > 0 && (
                <div className="flex items-center gap-1.5" title="Suítes">
                  <Bath className="h-4 w-4 text-primary/70" />
                  <span>{property.qtdeSuites}</span>
                </div>
              )}
              {property.qtdeVagas !== undefined && property.qtdeVagas > 0 && (
                <div className="flex items-center gap-1.5" title="Vagas">
                  <Car className="h-4 w-4 text-primary/70" />
                  <span>{property.qtdeVagas}</span>
                </div>
              )}
              {(property.areaConstruida || property.areaTotal) && (
                <div className="flex items-center gap-1.5" title="Área">
                  <Maximize className="h-4 w-4 text-primary/70" />
                  <span>{property.areaConstruida || property.areaTotal} m²</span>
                </div>
              )}
            </div>

            {/* CTA Button - Pushed to bottom */}
            <div className="mt-auto">
              <Button 
                variant="goldOutline" 
                size="sm" 
                className="w-full group/btn"
              >
                Ver Imóvel
                <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </article>
      </Link>
    );
  }
);
PropertyCard.displayName = 'PropertyCard';