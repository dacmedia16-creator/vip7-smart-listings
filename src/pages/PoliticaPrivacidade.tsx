import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, Shield, Database, Users, Cookie, Lock, Mail, FileText } from "lucide-react";

const PoliticaPrivacidade = () => {
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
                Política de Privacidade
              </span>
            </h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Content */}
          <Card className="max-w-4xl mx-auto border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12 space-y-8">
              {/* Introdução */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">1. Introdução</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A VIP7 Imóveis, com sede em Sorocaba-SP, está comprometida em proteger a privacidade dos 
                  visitantes e usuários de nosso site. Esta Política de Privacidade descreve como coletamos, 
                  usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral 
                  de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                </p>
              </section>

              {/* Dados Coletados */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">2. Dados Coletados</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Podemos coletar os seguintes tipos de informações:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Dados de identificação:</strong> nome completo, CPF, RG, estado civil</li>
                  <li><strong>Dados de contato:</strong> e-mail, telefone, endereço</li>
                  <li><strong>Dados de navegação:</strong> endereço IP, tipo de navegador, páginas visitadas, tempo de permanência</li>
                  <li><strong>Dados financeiros:</strong> informações necessárias para análise de crédito (quando aplicável)</li>
                  <li><strong>Dados de preferência:</strong> tipos de imóveis de interesse, faixa de preço, localização desejada</li>
                </ul>
              </section>

              {/* Finalidade */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">3. Finalidade do Uso dos Dados</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos suas informações para:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Prestar serviços de intermediação imobiliária</li>
                  <li>Enviar informações sobre imóveis compatíveis com seu perfil</li>
                  <li>Responder solicitações e dúvidas</li>
                  <li>Elaborar propostas e contratos</li>
                  <li>Realizar análise de crédito junto a instituições financeiras (com seu consentimento)</li>
                  <li>Enviar comunicações de marketing (com seu consentimento)</li>
                  <li>Melhorar nossos serviços e experiência do usuário</li>
                  <li>Cumprir obrigações legais e regulatórias</li>
                </ul>
              </section>

              {/* Compartilhamento */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">4. Compartilhamento de Dados</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Seus dados podem ser compartilhados com:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Instituições financeiras:</strong> para análise de financiamento imobiliário</li>
                  <li><strong>Cartórios:</strong> para registro de documentos e contratos</li>
                  <li><strong>Construtoras e incorporadoras:</strong> parceiras em lançamentos imobiliários</li>
                  <li><strong>Prestadores de serviço:</strong> assessoria jurídica, despachantes</li>
                  <li><strong>Órgãos públicos:</strong> quando exigido por lei</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Não vendemos, alugamos ou comercializamos seus dados pessoais para terceiros.
                </p>
              </section>

              {/* Cookies */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Cookie className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">5. Cookies e Tecnologias de Rastreamento</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies e tecnologias similares para:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Lembrar suas preferências de navegação</li>
                  <li>Analisar o tráfego e comportamento no site</li>
                  <li>Personalizar conteúdo e anúncios</li>
                  <li>Melhorar a performance do site</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Você pode configurar seu navegador para recusar cookies, mas isso pode afetar 
                  algumas funcionalidades do site.
                </p>
              </section>

              {/* Direitos do Usuário */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">6. Seus Direitos (LGPD)</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  De acordo com a LGPD, você tem direito a:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Confirmar a existência de tratamento de seus dados</li>
                  <li>Acessar seus dados pessoais</li>
                  <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                  <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários</li>
                  <li>Solicitar a portabilidade dos dados</li>
                  <li>Revogar consentimento a qualquer momento</li>
                  <li>Ser informado sobre compartilhamento de dados</li>
                </ul>
              </section>

              {/* Segurança */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">7. Segurança dos Dados</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Criptografia de dados em trânsito (SSL/TLS)</li>
                  <li>Controle de acesso restrito às informações</li>
                  <li>Monitoramento contínuo de segurança</li>
                  <li>Treinamento da equipe sobre proteção de dados</li>
                  <li>Backups regulares e planos de contingência</li>
                </ul>
              </section>

              {/* Contato DPO */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">8. Contato</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-foreground font-medium">VIP7 Imóveis</p>
                  <p className="text-muted-foreground">E-mail: privacidade@vip7imoveis.com.br</p>
                  <p className="text-muted-foreground">Telefone: (15) 3500-8641</p>
                  <p className="text-muted-foreground">Endereço: Sorocaba - SP</p>
                </div>
              </section>

              {/* Atualizações */}
              <section className="space-y-4">
                <h2 className="text-2xl font-heading font-semibold text-foreground">9. Atualizações desta Política</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Esta política pode ser atualizada periodicamente. Recomendamos que você a consulte 
                  regularmente. Alterações significativas serão comunicadas por meio de aviso em nosso 
                  site ou por e-mail.
                </p>
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

export default PoliticaPrivacidade;
