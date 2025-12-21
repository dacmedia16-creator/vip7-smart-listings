import { Award, Users, Shield, Handshake } from 'lucide-react';

const differentials = [
  {
    icon: Award,
    title: 'Experiência',
    description: 'Mais de 15 anos no mercado imobiliário de alto padrão.',
  },
  {
    icon: Users,
    title: 'Atendimento Personalizado',
    description: 'Cada cliente recebe atenção exclusiva e dedicada.',
  },
  {
    icon: Shield,
    title: 'Segurança Jurídica',
    description: 'Assessoria completa em toda a documentação.',
  },
  {
    icon: Handshake,
    title: 'Negociação Especializada',
    description: 'Intermediação profissional para os melhores acordos.',
  },
];

const stats = [
  { value: '500+', label: 'Imóveis Vendidos' },
  { value: '98%', label: 'Clientes Satisfeitos' },
  { value: '15+', label: 'Anos de Mercado' },
];

export function QuemSomosSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            {/* Decorated Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
              <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium">
                Quem Somos
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-6 leading-tight">
              Transformando sonhos em{' '}
              <span className="text-gradient-gold italic">endereços</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              A VIP7 Imóveis é referência em imóveis de médio e alto padrão em Sorocaba e região. 
              Nossa missão é proporcionar uma experiência única na compra, venda e locação de imóveis.
            </p>

            {/* Quote */}
            <blockquote className="relative pl-6 py-4 mb-10 border-l-2 border-primary">
              <p className="text-lg text-foreground/90 italic leading-relaxed">
                "Nosso compromisso é encontrar o imóvel perfeito para cada cliente, 
                com atendimento exclusivo e transparência em cada etapa."
              </p>
              <footer className="mt-4 text-sm text-muted-foreground">
                — Equipe VIP7 Imóveis
              </footer>
            </blockquote>

            {/* Differentials Grid */}
            <div className="grid grid-cols-2 gap-6">
              {differentials.map((item, index) => (
                <div
                  key={item.title}
                  className="group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Image with Stats */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
                alt="Imóvel de luxo"
                className="w-full aspect-[4/5] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>

            {/* Stats Cards Overlay */}
            <div className="absolute -bottom-8 left-4 right-4 grid grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass-luxury-dark rounded-xl p-4 text-center"
                >
                  <p className="text-2xl md:text-3xl font-heading font-bold text-gradient-gold mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Decorative Border */}
            <div className="absolute -top-4 -right-4 w-full h-full border border-primary/20 rounded-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}