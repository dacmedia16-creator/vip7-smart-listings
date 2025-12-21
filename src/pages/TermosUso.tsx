import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, FileText, CheckCircle, XCircle, Scale, Link as LinkIcon, AlertTriangle, Gavel } from "lucide-react";

const TermosUso = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              <span className="bg-gradient-to-r from-primary via-gold to-primary bg-clip-text text-transparent">
                Termos de Uso
              </span>
            </h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Content */}
          <Card className="max-w-4xl mx-auto border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12 space-y-8">
              {/* Aceitação */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">1. Aceitação dos Termos</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Ao acessar e utilizar o site da VIP7 Imóveis, você concorda com estes Termos de Uso 
                  e com nossa Política de Privacidade. Se você não concordar com qualquer parte destes 
                  termos, solicitamos que não utilize nosso site.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Estes termos podem ser atualizados a qualquer momento, sendo sua responsabilidade 
                  verificá-los periodicamente.
                </p>
              </section>

              {/* Descrição do Serviço */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">2. Descrição do Serviço</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A VIP7 Imóveis é uma empresa de intermediação imobiliária devidamente registrada no 
                  CRECI-SP. Nosso site oferece:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Divulgação de imóveis para venda e locação</li>
                  <li>Informações sobre empreendimentos e lançamentos</li>
                  <li>Ferramentas de busca e filtro de imóveis</li>
                  <li>Canal de contato para atendimento</li>
                  <li>Conteúdo informativo sobre o mercado imobiliário</li>
                </ul>
              </section>

              {/* Uso Permitido */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">3. Uso Permitido</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Você está autorizado a:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Navegar e consultar os imóveis disponíveis</li>
                  <li>Entrar em contato conosco para obter informações</li>
                  <li>Compartilhar links de imóveis em redes sociais</li>
                  <li>Imprimir páginas para uso pessoal e não comercial</li>
                  <li>Solicitar agendamento de visitas</li>
                </ul>
              </section>

              {/* Uso Proibido */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-destructive" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">4. Uso Proibido</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  É expressamente proibido:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Copiar, reproduzir ou distribuir conteúdo sem autorização</li>
                  <li>Utilizar as informações para fins comerciais sem permissão</li>
                  <li>Coletar dados de forma automatizada (scraping, crawling)</li>
                  <li>Interferir no funcionamento do site</li>
                  <li>Tentar acessar áreas restritas sem autorização</li>
                  <li>Publicar conteúdo falso, difamatório ou ilegal</li>
                  <li>Usar o site para envio de spam ou mensagens não solicitadas</li>
                  <li>Violar direitos de propriedade intelectual</li>
                </ul>
              </section>

              {/* Propriedade Intelectual */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Scale className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">5. Propriedade Intelectual</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Todo o conteúdo disponível neste site é de propriedade da VIP7 Imóveis ou de seus 
                  parceiros e está protegido por leis de propriedade intelectual, incluindo:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Marca, logotipo e identidade visual</li>
                  <li>Textos, descrições e conteúdo editorial</li>
                  <li>Fotografias e vídeos dos imóveis</li>
                  <li>Layout, design e código-fonte do site</li>
                  <li>Bases de dados e compilações de informações</li>
                </ul>
              </section>

              {/* Isenção de Responsabilidade */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-gold" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">6. Isenção de Responsabilidade</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A VIP7 Imóveis não se responsabiliza por:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Informações desatualizadas sobre disponibilidade ou valores dos imóveis</li>
                  <li>Erros tipográficos ou de digitação nas descrições</li>
                  <li>Diferenças entre fotos/plantas e o imóvel real</li>
                  <li>Indisponibilidade temporária do site por manutenção ou falhas técnicas</li>
                  <li>Decisões tomadas com base nas informações do site</li>
                  <li>Conteúdo de sites de terceiros acessados através de links</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  As informações dos imóveis são fornecidas por proprietários e parceiros. 
                  Recomendamos sempre confirmar os dados diretamente conosco antes de tomar decisões.
                </p>
              </section>

              {/* Links Externos */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">7. Links para Terceiros</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Nosso site pode conter links para sites de terceiros (bancos, cartórios, órgãos públicos). 
                  Estes links são fornecidos apenas para conveniência. A VIP7 Imóveis não tem controle 
                  sobre estes sites e não assume responsabilidade por seu conteúdo, políticas de 
                  privacidade ou práticas.
                </p>
              </section>

              {/* Modificações */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">8. Modificações</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A VIP7 Imóveis reserva-se o direito de modificar estes Termos de Uso a qualquer 
                  momento, sem aviso prévio. As modificações entram em vigor imediatamente após 
                  sua publicação no site. O uso continuado do site após alterações constitui 
                  aceitação dos novos termos.
                </p>
              </section>

              {/* Legislação e Foro */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Gavel className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">9. Legislação Aplicável e Foro</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
                  Fica eleito o foro da Comarca de Sorocaba, Estado de São Paulo, para dirimir 
                  quaisquer questões decorrentes destes termos, com exclusão de qualquer outro, 
                  por mais privilegiado que seja.
                </p>
              </section>

              {/* Contato */}
              <section className="space-y-4">
                <h2 className="text-2xl font-heading font-semibold text-foreground">10. Contato</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para dúvidas sobre estes Termos de Uso, entre em contato:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-foreground font-medium">VIP7 Imóveis</p>
                  <p className="text-muted-foreground">E-mail: contato@vip7imoveis.com.br</p>
                  <p className="text-muted-foreground">Telefone: (15) 3500-8641</p>
                  <p className="text-muted-foreground">Endereço: Sorocaba - SP</p>
                </div>
              </section>

              {/* Botão Voltar */}
              <div className="pt-8 flex justify-center">
                <Button 
                  onClick={scrollToTop} 
                  variant="outline" 
                  className="gap-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default TermosUso;
