import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, MapPin, DollarSign, ArrowRight, ChevronDown, Hash, BedDouble, Bath } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { CondominioMultiSelect } from '@/components/CondominioMultiSelect';
import { useCidades, useBairros, useCondominios } from '@/hooks/useImoveis';
import { getFinalidadeCode } from '@/services/imoviewApi';

const PRICE_MIN = 0;
const PRICE_MAX = 10000000;
const PRICE_STEP = 50000;

export function HeroSection() {
  const navigate = useNavigate();
  const [finalidade, setFinalidade] = useState<string>('venda');
  const [tipo, setTipo] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [bairro, setBairro] = useState<string>('');
  const [quartos, setQuartos] = useState<string>('');
  const [banheiros, setBanheiros] = useState<string>('');
  const [condominiosCodes, setCondominiosCodes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [codigoImovel, setCodigoImovel] = useState<string>('');

  const finalidadeCode = getFinalidadeCode(finalidade);
  
  const { data: cidades = [] } = useCidades(finalidadeCode);
  const { data: bairros = [] } = useBairros(cidade || undefined, finalidadeCode);
  // Carregar TODOS os condomínios (sem filtro de cidade) para cache inicial
  const { data: todosCondominios = [], isLoading: isLoadingTodosCondominios } = useCondominios(undefined, finalidadeCode);
  
  // Filtrar localmente por cidade quando selecionada (muito mais rápido)
  const condominiosFiltrados = useMemo(() => {
    if (!cidade) return todosCondominios;
    return todosCondominios.filter(c => c.cidade === cidade);
  }, [todosCondominios, cidade]);

  // Reset bairro e condominio quando cidade mudar
  useEffect(() => {
    setBairro('');
    setCondominiosCodes([]);
  }, [cidade]);

  // Format price for display
  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)} mi`;
    }
    return `R$ ${(value / 1000).toFixed(0)} mil`;
  };

  // Validation: check if min > max (invalid state)
  const isPriceRangeInvalid = priceRange[0] > priceRange[1];

  const priceRangeLabel = useMemo(() => {
    const [min, max] = priceRange;
    if (isPriceRangeInvalid) return 'Faixa inválida';
    if (min === PRICE_MIN && max === PRICE_MAX) return 'Qualquer valor';
    if (min === PRICE_MIN) return `Até ${formatPrice(max)}`;
    if (max === PRICE_MAX) return `A partir de ${formatPrice(min)}`;
    return `${formatPrice(min)} – ${formatPrice(max)}`;
  }, [priceRange, isPriceRangeInvalid]);

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? PRICE_MIN : Number(raw);
    setPriceRange([num, priceRange[1]]);
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? PRICE_MAX : Number(raw);
    setPriceRange([priceRange[0], num]);
  };

  const handleSliderChange = (values: number[]) => {
    setPriceRange([values[0], values[1]]);
  };

  const handleSearchByCodigo = () => {
    const codigo = codigoImovel.trim().replace(/\D/g, '');
    if (codigo) {
      navigate(`/imovel/${codigo}`);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (finalidade) params.set('finalidade', finalidade);
    if (tipo) params.set('tipo', tipo);
    if (cidade) params.set('cidade', cidade);
    if (bairro) params.set('bairro', bairro);
    if (quartos) params.set('quartos', quartos);
    if (banheiros) params.set('banheiros', banheiros);
    if (condominiosCodes.length > 0) params.set('condominios', condominiosCodes.join(','));
    if (priceRange[0] > PRICE_MIN) params.set('valorMin', String(priceRange[0]));
    if (priceRange[1] < PRICE_MAX) params.set('valorMax', String(priceRange[1]));
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
          <div className="glass-luxury-dark rounded-2xl p-6 md:p-8 border border-primary/10 max-h-[75vh] md:max-h-none overflow-y-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Tipo */}
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                  <Home className="h-4 w-4 text-primary mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="casa_condominio">Casa de Condomínio</SelectItem>
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

            </div>

            {/* Second Row Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Quartos */}
              <Select value={quartos} onValueChange={setQuartos}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                  <BedDouble className="h-4 w-4 text-primary mr-2" />
                  <SelectValue placeholder="Quartos" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="1">1 quarto</SelectItem>
                  <SelectItem value="2">2 quartos</SelectItem>
                  <SelectItem value="3">3 quartos</SelectItem>
                  <SelectItem value="4">4 quartos</SelectItem>
                  <SelectItem value="5">5+ quartos</SelectItem>
                </SelectContent>
              </Select>

              {/* Banheiros */}
              <Select value={banheiros} onValueChange={setBanheiros}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors">
                  <Bath className="h-4 w-4 text-primary mr-2" />
                  <SelectValue placeholder="Banheiros" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="1">1 banheiro</SelectItem>
                  <SelectItem value="2">2 banheiros</SelectItem>
                  <SelectItem value="3">3 banheiros</SelectItem>
                  <SelectItem value="4">4 banheiros</SelectItem>
                  <SelectItem value="5">5+ banheiros</SelectItem>
                </SelectContent>
              </Select>

              {/* Condomínio */}
              <CondominioMultiSelect
                condominios={condominiosFiltrados}
                values={condominiosCodes}
                onValuesChange={setCondominiosCodes}
                placeholder="Todos os condomínios"
                isLoading={isLoadingTodosCondominios}
                triggerClassName="bg-secondary/50 border-border/50 h-12 rounded-xl hover:border-primary/50 transition-colors"
                maxSelections={5}
              />
            </div>

            {/* Price Range Filter */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className={cn("h-4 w-4", isPriceRangeInvalid ? "text-destructive" : "text-primary")} />
                <span className={cn("text-sm font-medium", isPriceRangeInvalid ? "text-destructive" : "text-foreground")}>Faixa de Preço</span>
                <span className={cn("ml-auto text-sm font-medium", isPriceRangeInvalid ? "text-destructive" : "text-primary")}>{priceRangeLabel}</span>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <label className={cn("text-xs mb-1 block", isPriceRangeInvalid ? "text-destructive" : "text-muted-foreground")}>Mínimo</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0"
                    value={priceRange[0] === PRICE_MIN ? '' : priceRange[0].toLocaleString('pt-BR')}
                    onChange={handleMinInputChange}
                    className={cn(
                      "bg-secondary/50 h-10 rounded-xl transition-colors",
                      isPriceRangeInvalid 
                        ? "border-destructive focus-visible:ring-destructive" 
                        : "border-border/50 hover:border-primary/50"
                    )}
                  />
                </div>
                <span className={cn("mt-5", isPriceRangeInvalid ? "text-destructive" : "text-muted-foreground")}>–</span>
                <div className="flex-1">
                  <label className={cn("text-xs mb-1 block", isPriceRangeInvalid ? "text-destructive" : "text-muted-foreground")}>Máximo</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Sem limite"
                    value={priceRange[1] === PRICE_MAX ? '' : priceRange[1].toLocaleString('pt-BR')}
                    onChange={handleMaxInputChange}
                    className={cn(
                      "bg-secondary/50 h-10 rounded-xl transition-colors",
                      isPriceRangeInvalid 
                        ? "border-destructive focus-visible:ring-destructive" 
                        : "border-border/50 hover:border-primary/50"
                    )}
                  />
                </div>
              </div>
              
              {isPriceRangeInvalid && (
                <p className="text-xs text-destructive mb-3">O valor mínimo não pode ser maior que o máximo</p>
              )}

              <Slider
                value={priceRange}
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                onValueChange={handleSliderChange}
                className="w-full"
              />
            </div>

            {/* Search by Code */}
            <div className="mb-6 p-4 bg-secondary/30 rounded-xl border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Busca por Código</span>
              </div>
              <div className="flex gap-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 2138"
                  value={codigoImovel}
                  onChange={(e) => setCodigoImovel(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && codigoImovel.trim() && handleSearchByCodigo()}
                  className="bg-secondary/50 border-border/50 h-10 rounded-xl hover:border-primary/50 transition-colors flex-1"
                />
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={handleSearchByCodigo}
                  disabled={!codigoImovel.trim()}
                  className="h-10 px-4 rounded-xl border-primary/50 hover:bg-primary/10"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Ir
                </Button>
              </div>
            </div>

            {/* Search Button */}
            <Button 
              variant="gold" 
              size="lg" 
              className="w-full group"
              onClick={handleSearch}
              disabled={isPriceRangeInvalid}
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