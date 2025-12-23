import * as React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BedDouble, Bath, Car, Maximize, ArrowRight, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImoviewProperty, formatPropertyValue } from '@/services/imoviewApi';

interface PropertyCardProps {
  property: ImoviewProperty;
}

export const PropertyCard = React.forwardRef<HTMLAnchorElement, PropertyCardProps>(
  ({ property }, ref) => {
    const isRental = property.finalidade === 1; // API Imoview: 1 = Aluguel
    const imageUrl = property.fotos?.[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';

    return (
      <Link
        ref={ref}
        to={`/imovel/${property.codigo}`}
        className="group block h-full"
      >
        <article className="card-luxury rounded-2xl overflow-hidden h-full flex flex-col">
          {/* Image Container */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={imageUrl}
              alt={property.titulo || 'Imóvel'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            
            {/* Top Badges */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="flex flex-col gap-2">
                {property.condominio && (
                  <Badge className="bg-primary/90 text-primary-foreground border-none text-xs font-medium">
                    {property.condominio}
                  </Badge>
                )}
                {property.aceitaPermuta && (
                  <Badge className="bg-emerald-600 text-white border-none text-xs font-medium flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    Aceita Permuta
                  </Badge>
                )}
              </div>
              <Badge className="bg-background/80 backdrop-blur-sm text-foreground border-none text-xs uppercase tracking-wider">
                {isRental ? 'Locação' : 'Venda'}
              </Badge>
            </div>

            {/* Price at bottom of image */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                {formatPropertyValue(property.valor, isRental)}
              </p>
              {isRental && (
                <span className="text-sm text-muted-foreground">/mês</span>
              )}
              {property.valorCondominio !== undefined && property.valorCondominio > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Condomínio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(property.valorCondominio)}
                </p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            {/* Title */}
            <h3 className="text-lg font-heading font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
              {property.titulo || property.tipoDescricao || 'Imóvel disponível'}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm truncate">
                {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
              </span>
            </div>

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