import { Link } from 'react-router-dom';
import { MapPin, BedDouble, Bath, Car, Maximize } from 'lucide-react';
import { Property } from '@/types/property';
import { formatCurrency, formatArea } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const isRental = property.finalidade === 'aluguel';

  return (
    <Link
      to={`/imovel/${property.id}`}
      className="group block card-hover"
    >
      <article className="bg-card rounded-lg overflow-hidden border border-border">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.imagens[0]}
            alt={property.titulo}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge variant="default" className="bg-primary text-primary-foreground">
              {property.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
            </Badge>
            {property.destaque && (
              <Badge className="bg-gradient-gold text-primary-foreground">
                Destaque
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-2xl font-heading font-bold text-foreground">
              {formatCurrency(property.valor)}
              {isRental && <span className="text-base font-normal text-muted-foreground">/mês</span>}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-heading font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {property.titulo}
          </h3>

          <div className="flex items-center gap-1 text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm">
              {property.bairro}, {property.cidade}
            </span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              <span>{property.dormitorios}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.suites}</span>
            </div>
            <div className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              <span>{property.vagas}</span>
            </div>
            <div className="flex items-center gap-1">
              <Maximize className="h-4 w-4" />
              <span>{formatArea(property.area)}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
