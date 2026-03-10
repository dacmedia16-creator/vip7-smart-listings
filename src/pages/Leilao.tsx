import {
  Gavel, Search, FileCheck, Shield, Home, TrendingUp,
  Phone, ArrowRight, CheckCircle, DollarSign, Hammer,
  Scale, KeyRound, PaintBucket, Eye } from
'lucide-react';
import { Layout } from '@/components/Layout';
import { ScrollReveal } from '@/components/ScrollReveal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const etapas = [
{ icon: Search, title: 'Busca da Oportunidade', description: 'Garimpo de imóveis alinhados ao perfil do investidor' },
{ icon: FileCheck, title: 'Análise Completa', description: 'Análise documental, jurídica e financeira detalhada' },
{ icon: Hammer, title: 'Arrematação', description: 'Orientação e acompanhamento na participação do leilão ou compra' },
{ icon: Scale, title: 'Burocracia', description: 'Toda a parte burocrática e documental do pós-arrematação' },
{ icon: KeyRound, title: 'Desocupação', description: 'Auxílio na desocupação do imóvel quando necessário' },
{ icon: Shield, title: 'Regularização', description: 'Matrícula regularizada e limpa, sem pendências' }];


const tradicionalItems = [
'Busca da oportunidade ideal',
'Análise documental, jurídica e financeira',
'Orientação para participar do leilão ou compra',
'Acompanhamento da arrematação',
'Etapa burocrática do pós-arrematação',
'Auxílio na desocupação do imóvel',
'Entrega com matrícula regularizada'];


const caixaForteItems = [
'Tudo da assessoria tradicional',
'Acompanhamento de reforma e preparação para revenda',
'Parceiros: arquitetos e prestadores locais',
'Transparência total nos custos',
'Auxílio na venda do imóvel'];


const Leilao = () => {
  return (
    <Layout>
      <SEOHead
        title="Assessoria para Investidores e Leilão"
        description="Assessoria especializada em investimentos imobiliários e oportunidades em leilão. Acompanhamos desde a busca até a entrega do imóvel regularizado."
        keywords="leilão de imóveis, investimento imobiliário, assessoria leilão, arrematação, imóveis Sorocaba" />
      

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal variant="fade-up">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
                <Gavel className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Investimentos & Leilão</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Assessoria para{' '}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  Investidores em Leilão
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Da busca da oportunidade até a entrega do imóvel regularizado em seu nome — com total transparência
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="max-w-4xl mx-auto">
              <div className="glass-luxury rounded-3xl p-8 md:p-12 border border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">Como Funciona</h2>
                </div>

                <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
                  <p>
                    Somos uma assessoria especializada em{' '}
                    <span className="text-foreground font-medium">investimentos imobiliários</span> e{' '}
                    <span className="text-foreground font-medium">oportunidades em leilão</span>. Nosso trabalho é auxiliar o investidor em todas as etapas do processo, desde a busca da oportunidade até a entrega do imóvel regularizado em seu nome.
                  </p>
                  <p>
                    Atuamos na identificação de oportunidades de acordo com o perfil de cada cliente, realizando o garimpo dos imóveis, a análise documental, jurídica e financeira, e apresentando ao investidor apenas negócios com{' '}
                    <span className="text-primary font-semibold">potencial e estratégia</span>.
                  </p>
                  <p>
                    O imóvel sempre fica em nome do investidor, e os pagamentos referentes à compra são feitos diretamente para a instituição responsável pela venda (banco, Caixa ou leiloeiro). O cliente não faz pagamentos ocultos para a assessoria.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Etapas do Processo */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Etapas do Processo</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full" />
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {etapas.map((etapa, index) =>
            <ScrollReveal key={etapa.title} variant="fade-up" delay={index * 0.08}>
                <div className="glass-luxury rounded-2xl p-6 h-full border border-primary/10 hover:border-primary/30 transition-all duration-300 text-center group">
                  <div className="relative mb-4">
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="p-4 rounded-2xl bg-primary/10 inline-flex group-hover:bg-primary/20 transition-colors">
                      <etapa.icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{etapa.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{etapa.description}</p>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* Modelos de Assessoria */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Modelos de Assessoria</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Dois formatos pensados para diferentes perfis de investidor
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full mt-4" />
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Tradicional */}
            <ScrollReveal variant="fade-up" delay={0.1}>
              <div className="glass-luxury rounded-3xl p-8 h-full border border-primary/10 hover:border-primary/30 transition-all duration-300 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Gavel className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Assessoria Tradicional</h3>
                    <span className="text-sm text-muted-foreground">Da oportunidade à regularização</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tradicionalItems.map((item) =>
                  <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  )}
                </ul>

                














                
              </div>
            </ScrollReveal>

            {/* Caixa-Forte */}
            <ScrollReveal variant="fade-up" delay={0.2}>
              <div className="relative glass-luxury rounded-3xl p-8 h-full border border-primary/30 hover:border-primary/50 transition-all duration-300 flex flex-col bg-gradient-to-br from-primary/5 to-transparent">
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  Mais Completo
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <TrendingUp className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Assessoria Caixa-Forte</h3>
                    <span className="text-sm text-muted-foreground">Da oportunidade à revenda com lucro</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {caixaForteItems.map((item) =>
                  <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  )}
                </ul>

                




















                
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Transparência */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <ScrollReveal variant="fade-up">
            <div className="max-w-4xl mx-auto">
              <div className="glass-luxury rounded-3xl p-8 md:p-12 border border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">Transparência Total</h2>
                </div>

                <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
                  <p>
                    O cliente compra o imóvel em <span className="text-foreground font-medium">seu próprio nome</span>, paga diretamente aos responsáveis pela venda e aos fornecedores envolvidos.
                  </p>
                  <p>
                    Quando existe leiloeiro envolvido, os 5% de comissão são pagos diretamente em nome do leiloeiro. Todos os custos da operação — pedreiro, arquiteto, material de construção — são pagos diretamente pelo cliente ao prestador ou fornecedor.
                  </p>
                  <p className="text-primary font-semibold">
                    A assessoria não intermedia valores ocultos. Nossa remuneração ocorre apenas na forma previamente combinada.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mt-8">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <Home className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium text-sm">Imóvel em seu nome</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <DollarSign className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium text-sm">Pagamentos diretos</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <Shield className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium text-sm">Sem taxas ocultas</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
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

                <h2 className="text-2xl md:text-3xl font-bold mb-4">Fale com Nossos Especialistas</h2>

                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  Segurança, análise, estratégia e acompanhamento completo — do garimpo da oportunidade até a matrícula regularizada. Vamos conversar sobre seu próximo investimento.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="gold" size="xl" asChild>
                    <a
                      href="https://wa.me/5515996544379?text=Olá! Gostaria de saber mais sobre a assessoria para investidores e leilão."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2">
                      
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
    </Layout>);

};

export default Leilao;