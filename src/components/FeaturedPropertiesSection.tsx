import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { PropertyCard } from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { useImoveisDestaque } from '@/hooks/useImoveis';
import { ImoviewProperty } from '@/services/imoviewApi';

interface FeaturedPropertiesSectionProps {
  title: string;
  subtitle: string;
  finalidade: 'venda' | 'aluguel';
}

export function FeaturedPropertiesSection({
  title,
  subtitle,
  finalidade,
}: FeaturedPropertiesSectionProps) {
  const finalidadeCode = finalidade === 'venda' ? 1 : 2;
  const { data: properties = [], isLoading, error } = useImoveisDestaque(finalidadeCode);

  // Limitar a 4 imóveis
  const featured = properties.slice(0, 4);

  if (isLoading) {
    return (
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (error || featured.length === 0) {
    return null;
  }

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-primary text-sm font-medium uppercase tracking-luxury">
                {finalidade === 'venda' ? 'Oportunidades' : 'Para Alugar'}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-3">
              {title.split(' ').map((word, i) => (
                i === title.split(' ').length - 1 ? (
                  <span key={i} className="text-gradient-gold italic">{word}</span>
                ) : (
                  <span key={i}>{word} </span>
                )
              ))}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              {subtitle}
            </p>
          </div>
          <Button variant="goldOutline" size="lg" asChild className="self-start lg:self-auto">
            <Link to={`/imoveis?finalidade=${finalidade}&destaque=true`} className="group">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((property: ImoviewProperty, index: number) => (
            <div
              key={property.codigo}
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
