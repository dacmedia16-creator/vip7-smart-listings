import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Facebook, Linkedin, Sparkles } from 'lucide-react';
import logoVip7 from '@/assets/logo-vip7.png';

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
    <footer className="relative overflow-hidden">
      {/* Top Border */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="bg-card/50">
        <div className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link to="/" className="block mb-6">
                <img 
                  src={logoVip7} 
                  alt="VIP7 Imóveis" 
                  className="h-12 w-auto"
                />
              </Link>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Especialistas em venda e locação de imóveis de alto padrão 
                em Sorocaba e região há mais de 15 anos.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="p-3 rounded-xl glass-luxury hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group"
                    aria-label={social.name}
                  >
                    <social.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-6 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Links Rápidos
              </h3>
              <ul className="space-y-4">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-primary/50 group-hover:w-2 transition-all" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-6 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Contato
              </h3>
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="p-2 rounded-lg glass-luxury">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-sm leading-relaxed">
                    Av. Antônio Carlos Comitre, 1500<br />
                    Sorocaba - SP, 18047-620
                  </span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="p-2 rounded-lg glass-luxury">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <a
                    href="tel:+5515999999999"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    (15) 99999-9999
                  </a>
                </li>
                <li className="flex items-center gap-4">
                  <div className="p-2 rounded-lg glass-luxury">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <a
                    href="mailto:contato@vip7imoveis.com.br"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    contato@vip7imoveis.com.br
                  </a>
                </li>
              </ul>
            </div>

            {/* Hours */}
            <div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-6 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Horário
              </h3>
              <div className="glass-luxury rounded-xl p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Segunda a Sexta</span>
                  <span className="text-foreground font-medium">9h às 18h</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sábado</span>
                  <span className="text-foreground font-medium">9h às 13h</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Domingo</span>
                  <span className="text-primary font-medium">Fechado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-16 pt-8 border-t border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} VIP7 Imóveis. Todos os direitos reservados.
              </p>
              <p className="text-sm text-muted-foreground">
                CRECI-SP 000000-J
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Link 
                to="/politica-privacidade" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Política de Privacidade
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link 
                to="/termos-uso" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
