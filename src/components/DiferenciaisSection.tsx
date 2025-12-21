import { ScrollReveal } from '@/components/ScrollReveal';

const differentials = [
  {
    number: '01',
    title: 'Avaliação Precisa',
    description: 'Análise detalhada do mercado para definir o valor real do seu imóvel.',
  },
  {
    number: '02',
    title: 'Marketing Premium',
    description: 'Divulgação profissional com fotos, vídeos e tours virtuais de alta qualidade.',
  },
  {
    number: '03',
    title: 'Rede Exclusiva',
    description: 'Acesso a uma carteira qualificada de compradores e investidores.',
  },
  {
    number: '04',
    title: 'Negociação Expert',
    description: 'Intermediação profissional para garantir as melhores condições.',
  },
  {
    number: '05',
    title: 'Assessoria Jurídica',
    description: 'Suporte completo em toda a documentação e processo de transferência.',
  },
  {
    number: '06',
    title: 'Pós-Venda',
    description: 'Acompanhamento contínuo mesmo após a conclusão do negócio.',
  },
];

export function DiferenciaisSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden bg-secondary/30">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
              <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium">
                Por que nos escolher
              </span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
            </div>

            <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Nossos{' '}
              <span className="text-gradient-gold italic">Diferenciais</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Oferecemos um serviço completo para quem busca excelência no mercado imobiliário.
            </p>
          </div>
        </ScrollReveal>

        {/* Differentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {differentials.map((item, index) => (
            <ScrollReveal key={item.number} variant="zoom-in" delay={index * 0.1}>
              <div className="group relative p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-500 h-full">
                {/* Number */}
                <span className="absolute top-6 right-6 text-5xl font-heading font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                  {item.number}
                </span>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-heading font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Hover Line */}
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-gold group-hover:w-full transition-all duration-500" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}