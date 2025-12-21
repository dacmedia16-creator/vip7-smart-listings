import { Link } from 'react-router-dom';
import { MapPin, BedDouble, Bath, Car, Maximize, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ImoviewProperty, formatPropertyValue } from '@/services/imoviewApi';

interface PropertyCardProps {
  property: ImoviewProperty;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const isRental = property.finalidade === 2;
  const imageUrl = property.fotos?.[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';

  return (
    <Link
      to={`/imovel/${property.codigo}`}
      className="group block"
    >
      <article className="card-luxury rounded-2xl overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageUrl}
            alt={property.titulo || 'Imóvel'}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none text-xs uppercase tracking-wider">
              {isRental ? 'Aluguel' : 'Venda'}
            </Badge>
            {property.destaque && (
              <Badge className="bg-gradient-to-r from-gold to-gold-light text-primary-foreground border-none text-xs uppercase tracking-wider">
                Destaque
              </Badge>
            )}
          </div>

          {/* View Button */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>

          {/* Price */}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              {formatPropertyValue(property.valor, isRental)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-heading font-semibold text-foreground mb-3 line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {property.titulo || property.tipoDescricao || 'Imóvel disponível'}
          </h3>

          <div className="flex items-center gap-2 text-muted-foreground mb-5">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm truncate">
              {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
            </span>
          </div>

          {/* Features */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            {property.qtdeQuartos !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BedDouble className="h-4 w-4" />
                <span className="text-sm">{property.qtdeQuartos}</span>
              </div>
            )}
            {property.qtdeSuites !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Bath className="h-4 w-4" />
                <span className="text-sm">{property.qtdeSuites}</span>
              </div>
            )}
            {property.qtdeVagas !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Car className="h-4 w-4" />
                <span className="text-sm">{property.qtdeVagas}</span>
              </div>
            )}
            {(property.areaConstruida || property.areaTotal) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Maximize className="h-4 w-4" />
                <span className="text-sm">{property.areaConstruida || property.areaTotal} m²</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
