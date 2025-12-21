import { 
  Building2, Users, Shield, Award, History, 
  Target, Handshake, ArrowRight, Phone, Star,
  Home, Briefcase, CheckCircle
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const whyChooseItems = [
  {
    icon: Award,
    title: "Experiência e Expertise",
    description: "Com anos de atuação no mercado, conhecemos profundamente o cenário imobiliário local."
  },
  {
    icon: Users,
    title: "Atendimento Personalizado",
    description: "Valorizamos cada cliente e buscamos entender suas preferências para oferecer soluções sob medida."
  },
  {
    icon: Handshake,
    title: "Transparência e Confiança",
    description: "Nossa conduta ética e transparente garante uma relação de confiança e segurança em todas as transações."
  }
];

const NossaHistoria = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal variant="fade-up">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
                <History className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Conheça Nossa Trajetória</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Nossa{' '}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  História
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Mais de uma década construindo sonhos e realizando conquistas no mercado imobiliário de Sorocaba
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="max-w-4xl mx-auto">
              <div className="glass-luxury rounded-3xl p-8 md:p-12 border border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">
                    Bem-vindo à Empresa VIP 7 Imóveis
                  </h2>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Fundada por dois irmãos visionários, a Empresa VIP 7 Imóveis é uma referência na 
                  <span className="text-foreground font-medium"> Região do Campolim</span>, em 
                  <span className="text-foreground font-medium"> Sorocaba - SP</span>, no ramo de imóveis de 
                  <span className="text-primary font-semibold"> médio e alto padrão</span>. 
                  Desde a nossa fundação, temos nos destacado pela excelência no atendimento e pela 
                  qualidade dos serviços prestados.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossa Jornada</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full" />
            </div>
          </ScrollReveal>
          
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <ScrollReveal variant="fade-up" delay={0.1}>
              <div className="glass-luxury rounded-2xl p-8 h-full border border-primary/10 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-primary/10">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-primary">10+</span>
                    <p className="text-muted-foreground">Anos de História</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Iniciamos nossa jornada há mais de 10 anos, com a missão de proporcionar aos nossos 
                  clientes as melhores opções de imóveis, aliando conforto, segurança e sofisticação.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal variant="fade-up" delay={0.2}>
              <div className="glass-luxury rounded-2xl p-8 h-full border border-primary/10 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-primary/10">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-primary">100%</span>
                    <p className="text-muted-foreground">Comprometimento</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Ao longo dos anos, construímos uma sólida reputação no mercado imobiliário, 
                  com várias vendas realizadas e clientes extremamente satisfeitos.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossos Serviços</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full" />
            </div>
          </ScrollReveal>
          
          <div className="max-w-4xl mx-auto">
            <ScrollReveal variant="fade-up" delay={0.1}>
              <div className="glass-luxury rounded-3xl p-8 md:p-12 border border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Especializados em Imóveis de Alto Padrão</h3>
                </div>
                
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Especializados em imóveis de médio e alto padrão, oferecemos uma ampla gama de opções, 
                  desde residências elegantes até investimentos comerciais estratégicos. Nossa equipe 
                  dedicada está sempre pronta para auxiliar nossos clientes a encontrar o imóvel ideal 
                  que atenda às suas necessidades e expectativas.
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                    <span className="font-medium">Residências Elegantes</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">Investimentos Comerciais</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Por que Escolher a VIP 7 Imóveis?
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full" />
            </div>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {whyChooseItems.map((item, index) => (
              <ScrollReveal key={item.title} variant="fade-up" delay={index * 0.1}>
                <div className="glass-luxury rounded-2xl p-8 h-full border border-primary/10 hover:border-primary/30 transition-all duration-300 text-center group">
                  <div className="p-4 rounded-2xl bg-primary/10 inline-flex mb-6 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="max-w-4xl mx-auto text-center">
              <div className="glass-luxury rounded-3xl p-8 md:p-12 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="inline-flex p-4 rounded-full bg-primary/10 mb-6">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Entre em Contato</h2>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  Estamos ansiosos para ajudá-lo a encontrar o imóvel dos seus sonhos ou a realizar 
                  um investimento sólido. Entre em contato conosco para agendar uma visita ou para 
                  obter mais informações sobre nossos serviços.
                </p>
                
                <p className="text-lg font-medium text-primary mb-8">
                  Seja bem-vindo à Empresa VIP 7 Imóveis, onde seu conforto e satisfação são nossa prioridade.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="gold" size="xl" asChild>
                    <a
                      href="https://wa.me/5515999999999?text=Olá! Gostaria de falar com um especialista."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <Phone className="h-5 w-5" />
                      Falar com Especialista
                    </a>
                  </Button>
                  
                  <Button variant="outline" size="xl" asChild>
                    <Link to="/contato" className="inline-flex items-center gap-2">
                      Página de Contato
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default NossaHistoria;
