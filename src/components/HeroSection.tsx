import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Building2, MapPin, DollarSign, ArrowRight, Star, Castle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { data: condominios = [] } = useCondominios(cidade || undefined, finalidadeCode);

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
          className="w-full h-full object-cover scale-105 animate-[float_20s_ease-in-out_infinite]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-10 w-px h-32 bg-gradient-to-b from-transparent via-primary/50 to-transparent hidden lg:block" />
      <div className="absolute top-1/3 right-10 w-px h-48 bg-gradient-to-b from-transparent via-primary/30 to-transparent hidden lg:block" />
      <div className="absolute bottom-1/4 left-20 w-24 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent hidden lg:block" />

      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center mb-16">
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-luxury mb-10 animate-fade-in"
          >
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-foreground/90 tracking-wide">
              Especialistas em imóveis de alto padrão
            </span>
            <Star className="h-4 w-4 text-primary fill-primary" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-bold text-foreground mb-8 animate-slide-up leading-[0.9]">
            Imóveis{' '}
            <span className="text-gradient-gold italic">exclusivos</span>
            <br />
            <span className="text-4xl md:text-5xl lg:text-6xl font-normal text-foreground/80">
              em Sorocaba e região
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up delay-100 leading-relaxed">
            Descubra residências que transcendem expectativas.{' '}
            <span className="text-foreground/80">
              Venda e locação de imóveis de médio e alto padrão.
            </span>
          </p>
        </div>

        {/* Search Panel */}
        <div className="max-w-5xl mx-auto animate-slide-up delay-200">
          <div className="glass-luxury-dark rounded-3xl p-8 md:p-10 border border-primary/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            {/* Finalidade Tabs */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setFinalidade('venda')}
                className={cn(
                  "flex-1 py-4 px-6 rounded-xl font-medium text-base transition-all duration-500",
                  finalidade === 'venda'
                    ? 'bg-gradient-to-r from-gold via-gold-light to-gold text-primary-foreground shadow-[0_0_30px_hsla(38,90%,55%,0.2)]'
                    : 'bg-secondary/50 text-foreground/70 hover:text-foreground hover:bg-secondary'
                )}
              >
                Comprar
              </button>
              <button
                onClick={() => setFinalidade('aluguel')}
                className={cn(
                  "flex-1 py-4 px-6 rounded-xl font-medium text-base transition-all duration-500",
                  finalidade === 'aluguel'
                    ? 'bg-gradient-to-r from-gold via-gold-light to-gold text-primary-foreground shadow-[0_0_30px_hsla(38,90%,55%,0.2)]'
                    : 'bg-secondary/50 text-foreground/70 hover:text-foreground hover:bg-secondary'
                )}
              >
                Alugar
              </button>
            </div>

            {/* Filters Grid - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
              {/* Tipo */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <Home className="h-3.5 w-3.5 text-primary" />
                  Tipo de Imóvel
                </label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="terreno">Terreno</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cidade */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Cidade
                </label>
                <Select value={cidade} onValueChange={setCidade}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {cidades.map((c) => (
                      <SelectItem key={c.codigo || c.nome} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bairro */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Bairro
                </label>
                <Select value={bairro} onValueChange={setBairro} disabled={!cidade}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                    <SelectValue placeholder={cidade ? "Selecione o bairro" : "Selecione a cidade primeiro"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {bairros.map((b) => (
                      <SelectItem key={b.codigo || b.nome} value={b.nome}>{b.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters Grid - Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {/* Condomínio */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <Castle className="h-3.5 w-3.5 text-primary" />
                  Condomínio
                </label>
                <Select value={condominioCode} onValueChange={setCondominioCode}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Todos os condomínios" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {condominios.map((c) => (
                      <SelectItem key={c.codigo} value={String(c.codigo)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Faixa de Preço */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                  Faixa de Preço
                </label>
                <Select value={faixaPreco} onValueChange={setFaixaPreco}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Qualquer valor" />
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
            </div>

            {/* Search Button */}
            <Button 
              variant="gold" 
              size="xl" 
              className="w-full group"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5 mr-2" />
              Buscar Imóveis
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-3 gap-8 animate-slide-up delay-300">
          {[
            { value: '500+', label: 'Imóveis vendidos' },
            { value: '15+', label: 'Anos de mercado' },
            { value: '98%', label: 'Clientes satisfeitos' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-heading font-bold text-gradient-gold mb-1">
                {stat.value}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </section>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
