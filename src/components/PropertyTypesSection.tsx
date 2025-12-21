import { Link } from 'react-router-dom';
import { Home, Building2, Key, Landmark } from 'lucide-react';

const propertyTypes = [
  {
    title: 'Casas à Venda',
    description: 'Encontre a casa dos seus sonhos',
    icon: Home,
    href: '/imoveis?finalidade=venda&tipo=casa',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600',
  },
  {
    title: 'Apartamentos à Venda',
    description: 'Apartamentos de alto padrão',
    icon: Building2,
    href: '/imoveis?finalidade=venda&tipo=apartamento',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600',
  },
  {
    title: 'Casas para Alugar',
    description: 'Locação de casas exclusivas',
    icon: Key,
    href: '/imoveis?finalidade=aluguel&tipo=casa',
    image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600',
  },
  {
    title: 'Apartamentos para Alugar',
    description: 'Alugue com segurança',
    icon: Landmark,
    href: '/imoveis?finalidade=aluguel&tipo=apartamento',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
  },
];

export function PropertyTypesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            O que você está <span className="text-gradient-gold">procurando?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore nossa seleção de imóveis por categoria e encontre exatamente o que você precisa.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {propertyTypes.map((item, index) => (
            <Link
              key={item.title}
              to={item.href}
              className="group relative rounded-xl overflow-hidden card-hover"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Image */}
              <div className="aspect-[4/5] relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="p-3 rounded-lg bg-primary/20 backdrop-blur-sm w-fit mb-4 group-hover:bg-primary/30 transition-colors">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
