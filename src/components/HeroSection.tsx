import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Home, MapPin, DollarSign, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CondominioCombobox } from '@/components/CondominioCombobox';
import { useCidades, useBairros, useCondominios } from '@/hooks/useImoveis';
import { getFinalidadeCode } from '@/services/imoviewApi';

export function HeroSection() {
  const navigate = useNavigate();
  const [finalidade, setFinalidade] = useState<string>('venda');
  const [tipo, setTipo] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [bairro, setBairro] = useState<string>('');
  const [condominioCode, setCondominioCode] = useState<string>('');
  const [faixaPreco, setFaixaPreco] = useState<string>('');

  const finalidadeCode = getFinalidadeCode(finalidade);
  
  const { data: cidades = [] } = useCidades(finalidadeCode);
  const { data: bairros = [] } = useBairros(cidade || undefined, finalidadeCode);
  const { data: condominios = [], isLoading: isLoadingCondominios } = useCondominios(cidade || undefined, finalidadeCode);

  // Reset bairro e condominio quando cidade mudar
  useEffect(() => {
    setBairro('');
    setCondominioCode('');
  }, [cidade]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (finalidade) params.set('finalidade', finalidade);
    if (tipo) params.set('tipo', tipo);
    if (cidade) params.set('cidade', cidade);
    if (bairro) params.set('bairro', bairro);
    if (condominioCode) params.set('condominioCode', condominioCode);
    if (faixaPreco) {
      const [min, max] = faixaPreco.split('-');
      if (min) params.set('valorMin', min);
      if (max) params.set('valorMax', max);
    }
    navigate(`/imoveis?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80"
          alt="Luxury home"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </div>

      {/* Decorative Vertical Lines */}
      <div className="absolute left-8 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent hidden lg:block" />
      <div className="absolute right-8 top-1/3 bottom-1/3 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent hidden lg:block" />

      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center mb-16">
          {/* Decorative Line with Text */}
          <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
            <div className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent to-primary" />
            <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-primary font-medium">
              Sorocaba & Região
            </span>
            <div className="h-px w-12 md:w-20 bg-gradient-to-l from-transparent to-primary" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-bold text-foreground mb-6 animate-slide-up leading-[1.1]">
            Especialistas em
            <br />
            <span className="text-gradient-gold italic">Imóveis de Alto Padrão</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up delay-100 leading-relaxed mb-10">
            Venda e locação de imóveis selecionados{' '}
            <span className="text-foreground/90">em Sorocaba e Votorantim</span>
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up delay-200">
            <Button 
              variant="gold" 
              size="xl" 
              asChild
              className="group"
            >
              <Link to="/imoveis?finalidade=venda">
                Ver Imóveis à Venda
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button 
              variant="goldOutline" 
              size="xl"
              asChild
            >
              <a
                href="https://wa.me/5515999999999?text=Olá! Gostaria de uma consultoria exclusiva."
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultoria Exclusiva
              </a>
            </Button>
          </div>

          {/* Credibility Badges */}
          <div className="flex flex-wrap gap-6 md:gap-10 justify-center text-sm text-muted-foreground animate-slide-up delay-300">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              +15 anos de experiência
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              +500 imóveis vendidos
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Atendimento exclusivo
            </span>
          </div>
        </div>

        {/* Compact Search Panel */}
        <div className="max-w-4xl mx-auto animate-slide-up delay-400">
          <div className="glass-luxury-dark rounded-2xl p-6 md:p-8 border border-primary/10">
            {/* Finalidade Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFinalidade('venda')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300",
                  finalidade === 'venda'
                    ? 'bg-gradient-gold text-primary-foreground'
                    : 'bg-secondary/50 text-foreground/70 hover:text-foreground hover:bg-secondary'
                )}
              >
                Comprar
              </button>
              <button
                onClick={() => setFinalidade('aluguel')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300",
                  finalidade === 'aluguel'
                    ? 'bg-gradient-gold text-primary-foreground'
                    : 'bg-secondary/50 text-foreground/70 hover:text-foreground hover:bg-secondary'
                )}
              >
                Alugar
              </button>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Tipo */}
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                  <Home className="h-4 w-4 text-primary mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>

              {/* Cidade */}
              <Select value={cidade} onValueChange={setCidade}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                  <MapPin className="h-4 w-4 text-primary mr-2" />
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {cidades.map((c) => (
                    <SelectItem key={c.codigo || c.nome} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Condomínio */}
              <CondominioCombobox
                condominios={condominios}
                value={condominioCode}
                onValueChange={setCondominioCode}
                placeholder="Condomínio"
                isLoading={isLoadingCondominios}
                triggerClassName="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors"
              />

              {/* Faixa de Preço */}
              <Select value={faixaPreco} onValueChange={setFaixaPreco}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                  <DollarSign className="h-4 w-4 text-primary mr-2" />
                  <SelectValue placeholder="Valor" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="0-500000">Até R$ 500 mil</SelectItem>
                  <SelectItem value="500000-1000000">R$ 500 mil - R$ 1 milhão</SelectItem>
                  <SelectItem value="1000000-2000000">R$ 1 milhão - R$ 2 milhões</SelectItem>
                  <SelectItem value="2000000-5000000">R$ 2 milhões - R$ 5 milhões</SelectItem>
                  <SelectItem value="5000000-">Acima de R$ 5 milhões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button 
              variant="gold" 
              size="lg" 
              className="w-full group"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5 mr-2" />
              Buscar Imóveis
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Descubra</span>
        <ChevronDown className="h-5 w-5 text-primary animate-bounce" />
      </div>
    </section>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}