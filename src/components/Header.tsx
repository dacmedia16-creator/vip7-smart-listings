import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import logoVip7 from '@/assets/logo-vip7.png';

const navigation = [
  { name: 'COMPRAR', href: '/imoveis?finalidade=venda' },
  { name: 'ALUGAR', href: '/imoveis?finalidade=aluguel' },
  { name: 'AVALIE SEU IMÓVEL', href: '/avaliacao' },
  { name: 'NOSSA HISTÓRIA', href: '/nossa-historia' },
  { name: 'CONTATO', href: '/contato' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href.split('?')[0]);
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled 
          ? "glass-luxury-dark py-3" 
          : "bg-transparent py-5"
      )}
    >
      <nav className="container mx-auto px-4 lg:px-8" aria-label="Global">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={logoVip7} 
              alt="VIP7 Imóveis" 
              className="h-10 md:h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "text-[10px] tracking-[0.1em] font-medium transition-all duration-300 relative group py-2",
                  isActive(item.href)
                    ? "text-primary"
                    : "text-foreground/70 hover:text-foreground"
                )}
              >
                {item.name}
                <span 
                  className={cn(
                    "absolute -bottom-1 left-0 h-px bg-primary transition-all duration-300",
                    isActive(item.href) ? "w-full" : "w-0 group-hover:w-full"
                  )}
                />
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:flex">
            <Button variant="gold" size="lg" asChild>
              <a
                href="https://wa.me/551535008641?text=Olá! Gostaria de falar com um especialista."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Fale com Especialista
              </a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-foreground hover:text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div 
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-500",
            mobileMenuOpen ? "max-h-[500px] opacity-100 mt-6" : "max-h-0 opacity-0"
          )}
        >
          <div className="glass-luxury rounded-2xl p-4 space-y-2">
            {navigation.map((item, index) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block px-4 py-3 text-base font-medium transition-all duration-300 rounded-xl",
                  isActive(item.href)
                    ? "text-primary bg-primary/10"
                    : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                )}
                onClick={() => setMobileMenuOpen(false)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-border">
              <Button variant="gold" size="lg" className="w-full" asChild>
                <a
                  href="https://wa.me/551535008641?text=Olá! Gostaria de falar com um especialista."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Fale com Especialista
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
