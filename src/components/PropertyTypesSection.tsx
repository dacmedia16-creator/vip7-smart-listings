import { Link } from 'react-router-dom';
import { Home, Building2, Key, Landmark, ArrowUpRight } from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';

const propertyTypes = [
  {
    title: 'Casas à Venda',
    description: 'Residências exclusivas para sua família',
    icon: Home,
    href: '/imoveis?finalidade=venda&tipo=casa',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
  },
  {
    title: 'Apartamentos à Venda',
    description: 'Apartamentos de alto padrão',
    icon: Building2,
    href: '/imoveis?finalidade=venda&tipo=apartamento',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80',
  },
  {
    title: 'Casas para Alugar',
    description: 'Locação de casas selecionadas',
    icon: Key,
    href: '/imoveis?finalidade=aluguel&tipo=casa',
    image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80',
  },
  {
    title: 'Apartamentos para Alugar',
    description: 'Alugue com segurança e conforto',
    icon: Landmark,
    href: '/imoveis?finalidade=aluguel&tipo=apartamento',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
  },
];

export function PropertyTypesSection() {
  return (
    <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center mb-16 lg:mb-20">
            <span className="text-primary text-sm font-medium uppercase tracking-luxury mb-4 block">
              Encontre seu imóvel
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground mb-6">
              O que você está{' '}
              <span className="text-gradient-gold italic">procurando?</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Explore nossa seleção curada de imóveis por categoria
            </p>
          </div>
        </ScrollReveal>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 max-w-4xl mx-auto">
          {propertyTypes.map((item, index) => (
            <ScrollReveal key={item.title} variant="fade-up" delay={index * 0.1}>
              <Link
                to={item.href}
                className="group relative rounded-full overflow-hidden card-luxury block shadow-2xl shadow-primary/40 hover:shadow-[0_25px_60px_-12px] hover:shadow-primary/50 transition-shadow duration-500"
              >
                {/* Background Image */}
                <div className="aspect-square relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent rounded-full" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  {/* Icon */}
                  <div className="p-3 rounded-full glass-luxury group-hover:bg-primary/20 transition-colors duration-500 mb-3">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>

                  <h3 className="text-lg font-heading font-bold text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
