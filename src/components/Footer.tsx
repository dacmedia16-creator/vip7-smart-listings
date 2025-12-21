import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Facebook, Linkedin } from 'lucide-react';

const quickLinks = [
  { name: 'Comprar', href: '/imoveis?finalidade=venda' },
  { name: 'Alugar', href: '/imoveis?finalidade=aluguel' },
  { name: 'Casas', href: '/imoveis?tipo=casa' },
  { name: 'Apartamentos', href: '/imoveis?tipo=apartamento' },
  { name: 'Condomínios', href: '/condominios' },
  { name: 'Avaliar Imóvel', href: '/avaliar' },
];

const socialLinks = [
  { name: 'Instagram', icon: Instagram, href: '#' },
  { name: 'Facebook', icon: Facebook, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6">
              <span className="text-2xl font-heading font-bold text-gradient-gold">
                VIP7
              </span>
              <span className="text-lg font-body text-foreground/80">
                Imóveis
              </span>
            </Link>
            <p className="text-muted-foreground mb-6">
              Especialistas em venda e locação de imóveis de médio e alto padrão 
              em Sorocaba e região. Mais de 10 anos de experiência no mercado imobiliário.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="p-2 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-6">
              Links Rápidos
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-6">
              Contato
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-muted-foreground">
                  Av. Antônio Carlos Comitre, 1500<br />
                  Sorocaba - SP, 18047-620
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <a
                  href="tel:+5515999999999"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  (15) 99999-9999
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <a
                  href="mailto:contato@vip7imoveis.com.br"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  contato@vip7imoveis.com.br
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-6">
              Horário de Atendimento
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex justify-between">
                <span>Segunda a Sexta</span>
                <span>9h às 18h</span>
              </li>
              <li className="flex justify-between">
                <span>Sábado</span>
                <span>9h às 13h</span>
              </li>
              <li className="flex justify-between">
                <span>Domingo</span>
                <span>Fechado</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} VIP7 Imóveis. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            CRECI-SP 000000-J
          </p>
        </div>
      </div>
    </footer>
  );
}
