import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Property } from '@/types/property';
import { PropertyCard } from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';

interface FeaturedPropertiesSectionProps {
  title: string;
  subtitle: string;
  properties: Property[];
  finalidade: 'venda' | 'aluguel';
}

export function FeaturedPropertiesSection({
  title,
  subtitle,
  properties,
  finalidade,
}: FeaturedPropertiesSectionProps) {
  const featured = properties.filter(
    (p) => p.finalidade === finalidade && p.destaque
  ).slice(0, 4);

  if (featured.length === 0) return null;

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
              {title}
            </h2>
            <p className="text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <Button variant="goldOutline" asChild>
            <Link to={`/imoveis?finalidade=${finalidade}&destaque=true`}>
              Ver todos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((property, index) => (
            <div
              key={property.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <PropertyCard property={property} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
