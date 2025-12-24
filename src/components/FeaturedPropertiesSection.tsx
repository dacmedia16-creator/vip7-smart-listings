import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyCardSkeleton } from '@/components/PropertyCardSkeleton';
import { Button } from '@/components/ui/button';
import { useImoveisDestaque } from '@/hooks/useImoveis';
import { ImoviewProperty } from '@/services/imoviewApi';
import { ScrollReveal } from '@/components/ScrollReveal';

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
  const finalidadeCode = finalidade === 'venda' ? 2 : 1; // API Imoview: 1 = Aluguel, 2 = Venda
  const { data: properties = [], isLoading, error } = useImoveisDestaque(finalidadeCode);

  // Limitar a 4 imóveis
  const featured = properties.slice(0, 4);

  if (error) {
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
        <ScrollReveal variant="fade-up">
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
        </ScrollReveal>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            // Skeleton loading state
            Array.from({ length: 4 }).map((_, index) => (
              <ScrollReveal key={index} variant="fade-up" delay={index * 0.1}>
                <PropertyCardSkeleton />
              </ScrollReveal>
            ))
          ) : featured.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum imóvel em destaque no momento.
            </div>
          ) : (
            // Properties
            featured.map((property: ImoviewProperty, index: number) => (
              <ScrollReveal key={property.codigo} variant="fade-up" delay={index * 0.1}>
                <PropertyCard property={property} />
              </ScrollReveal>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
