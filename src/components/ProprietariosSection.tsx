import { MessageCircle, TrendingUp, Shield, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ScrollReveal';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Avaliação Gratuita',
    description: 'Avaliamos seu imóvel sem compromisso, com expertise de mercado',
  },
  {
    icon: Shield,
    title: 'Segurança Total',
    description: 'Contratos e documentação sempre em conformidade legal',
  },
  {
    icon: Clock,
    title: 'Agilidade',
    description: 'Processo rápido e desburocratizado para você',
  },
];

export function ProprietariosSection() {
  return (
    <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full">
        <div className="w-full h-full bg-gradient-to-l from-primary/5 to-transparent" />
      </div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="order-2 lg:order-1">
            <ScrollReveal variant="fade-right">
              <span className="text-primary text-sm font-medium uppercase tracking-luxury mb-4 block">
                Para Proprietários
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground mb-6 leading-tight">
                Quer{' '}
                <span className="text-gradient-gold italic">vender</span>
                {' '}ou{' '}
                <span className="text-gradient-gold italic">alugar</span>
                <br />seu imóvel?
              </h2>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Conte com a experiência e credibilidade da VIP7 Imóveis para 
                comercializar seu patrimônio com segurança e agilidade.
              </p>
            </ScrollReveal>

            {/* Benefits */}
            <div className="space-y-6 mb-10">
              {benefits.map((benefit, index) => (
                <ScrollReveal key={benefit.title} variant="fade-up" delay={index * 0.15}>
                  <div className="flex items-start gap-5 group">
                    <div className="p-3 rounded-xl glass-luxury group-hover:bg-primary/10 transition-colors duration-300">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-lg mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* CTA */}
            <ScrollReveal variant="fade-up" delay={0.5}>
              <Button variant="gold" size="xl" asChild className="group">
                <a
                  href="https://wa.me/551535008641?text=Olá! Gostaria de avaliar meu imóvel para venda/locação."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3"
                >
                  <MessageCircle className="h-5 w-5" />
                  Solicitar Avaliação Gratuita
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </ScrollReveal>
          </div>

          {/* Image */}
          <ScrollReveal variant="fade-left" delay={0.2} className="order-1 lg:order-2">
            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80"
                  alt="Avaliação de imóveis"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>

              {/* Stats Card */}
              <ScrollReveal variant="zoom-in" delay={0.5}>
                <div className="absolute -bottom-8 -left-8 glass-luxury-dark p-8 rounded-2xl border border-primary/10 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                  <div className="text-5xl font-heading font-bold text-gradient-gold mb-2">
                    500+
                  </div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wider">
                    Imóveis comercializados
                  </div>
                </div>
              </ScrollReveal>

              {/* Decorative */}
              <div className="absolute -top-6 -right-6 w-24 h-24 border-2 border-primary/20 rounded-2xl" />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
