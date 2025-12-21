import { MessageCircle, TrendingUp, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Avaliação Gratuita',
    description: 'Avaliamos seu imóvel sem compromisso',
  },
  {
    icon: Shield,
    title: 'Segurança Total',
    description: 'Contratos e documentação em dia',
  },
  {
    icon: Clock,
    title: 'Agilidade',
    description: 'Processo rápido e desburocratizado',
  },
];

export function ProprietariosSection() {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
        <div className="w-full h-full bg-gradient-to-l from-primary to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="text-primary font-medium mb-4 block">
              Para Proprietários
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-6">
              Quer <span className="text-gradient-gold">vender</span> ou{' '}
              <span className="text-gradient-gold">alugar</span> seu imóvel?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Conte com a experiência e credibilidade da VIP7 Imóveis para 
              comercializar seu patrimônio com segurança e agilidade. 
              Oferecemos avaliação gratuita e atendimento personalizado.
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-8">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button variant="gold" size="xl" asChild>
              <a
                href="https://wa.me/5515999999999?text=Olá! Gostaria de avaliar meu imóvel para venda/locação."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Solicitar Avaliação Gratuita
              </a>
            </Button>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"
                alt="Avaliação de imóveis"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Stats Card */}
            <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl border border-border shadow-xl">
              <div className="text-3xl font-heading font-bold text-gradient-gold mb-1">
                500+
              </div>
              <div className="text-sm text-muted-foreground">
                Imóveis comercializados
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
