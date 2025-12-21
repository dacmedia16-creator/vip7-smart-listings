import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Building2, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCidades, getBairros } from '@/data/mockProperties';

export function HeroSection() {
  const navigate = useNavigate();
  const [finalidade, setFinalidade] = useState<string>('venda');
  const [tipo, setTipo] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [bairro, setBairro] = useState<string>('');
  const [faixaPreco, setFaixaPreco] = useState<string>('');

  const cidades = getCidades();
  const bairros = getBairros(cidade || undefined);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (finalidade) params.set('finalidade', finalidade);
    if (tipo) params.set('tipo', tipo);
    if (cidade) params.set('cidade', cidade);
    if (bairro) params.set('bairro', bairro);
    if (faixaPreco) {
      const [min, max] = faixaPreco.split('-');
      if (min) params.set('valorMin', min);
      if (max) params.set('valorMax', max);
    }
    navigate(`/imoveis?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">Especialistas em imóveis de alto padrão</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground mb-6 animate-slide-up">
            Imóveis exclusivos em{' '}
            <span className="text-gradient-gold">Sorocaba</span>
            {' '}e região
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up delay-100">
            Especialistas em venda e locação de imóveis de médio e alto padrão. 
            Encontre o imóvel dos seus sonhos com a VIP7 Imóveis.
          </p>
        </div>

        {/* Search Panel */}
        <div className="max-w-5xl mx-auto animate-slide-up delay-200">
          <div className="glass rounded-2xl p-6 md:p-8 border border-border shadow-2xl">
            {/* Finalidade Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFinalidade('venda')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                  finalidade === 'venda'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Comprar
              </button>
              <button
                onClick={() => setFinalidade('aluguel')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                  finalidade === 'aluguel'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Alugar
              </button>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Tipo */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Tipo de Imóvel
                </label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cidade */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Cidade
                </label>
                <Select value={cidade} onValueChange={setCidade}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    {cidades.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bairro */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bairro
                </label>
                <Select value={bairro} onValueChange={setBairro}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Todos os bairros" />
                  </SelectTrigger>
                  <SelectContent>
                    {bairros.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Faixa de Preço */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Faixa de Preço
                </label>
                <Select value={faixaPreco} onValueChange={setFaixaPreco}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Qualquer valor" />
                  </SelectTrigger>
                  <SelectContent>
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
              className="w-full"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5 mr-2" />
              Buscar Imóveis
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
