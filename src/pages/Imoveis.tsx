import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PropertyCard } from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useImoveis, useCidades, useBairros, useCondominios } from '@/hooks/useImoveis';
import { getFinalidadeCode, formatPropertyValue } from '@/services/imoviewApi';

export default function Imoveis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);

  // Get filter values from URL
  const finalidade = searchParams.get('finalidade') || '';
  const tipo = searchParams.get('tipo') || '';
  const cidade = searchParams.get('cidade') || '';
  const bairro = searchParams.get('bairro') || '';
  const condominioCode = searchParams.get('condominioCode') || '';
  const ordenar = searchParams.get('ordenar') || 'recentes';

  const finalidadeCode = getFinalidadeCode(finalidade);

  // Fetch data from API
  const { data: cidades = [] } = useCidades(finalidadeCode);
  const { data: bairros = [] } = useBairros(cidade || undefined, finalidadeCode);
  const { data: condominios = [] } = useCondominios(cidade || undefined, finalidadeCode);

  // Build filters for API call
  const apiFilters = {
    finalidade: finalidadeCode,
    tipo: tipo || undefined,
    cidade: cidade || undefined,
    bairro: bairro || undefined,
    codigoCondominio: condominioCode ? Number(condominioCode) : undefined,
    valorMin: priceRange[0] > 0 ? priceRange[0] : undefined,
    valorMax: priceRange[1] < 10000000 ? priceRange[1] : undefined,
    ordenarPor: ordenar === 'menor_preco' ? 'valor_asc' : ordenar === 'maior_preco' ? 'valor_desc' : undefined,
    limite: 20, // API Imoview permite no máximo 20 registros por página
  };

  const { data: properties = [], isLoading, error } = useImoveis(apiFilters);

  // Reset bairro when cidade changes
  useEffect(() => {
    if (cidade) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('bairro');
      newParams.delete('condominio');
      setSearchParams(newParams);
    }
  }, [cidade]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setPriceRange([0, 10000000]);
  };

  const getPageTitle = () => {
    const parts = [];
    if (tipo === 'casa') parts.push('Casas');
    else if (tipo === 'apartamento') parts.push('Apartamentos');
    else parts.push('Imóveis');

    if (finalidade === 'venda') parts.push('à Venda');
    else if (finalidade === 'aluguel') parts.push('para Alugar');

    if (cidade) parts.push(`em ${cidade}`);
    if (bairro) parts.push(`- ${bairro}`);

    return parts.join(' ');
  };

  const formatPriceLabel = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    return `R$ ${(value / 1000).toFixed(0)}K`;
  };

  return (
    <Layout>
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
                {getPageTitle()}
              </h1>
              <p className="text-muted-foreground">
                {isLoading ? 'Carregando...' : `${properties.length} imóveis encontrados`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Sort */}
              <Select value={ordenar} onValueChange={(v) => updateFilter('ordenar', v)}>
                <SelectTrigger className="w-[180px] bg-secondary border-border">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="recentes">Mais recentes</SelectItem>
                  <SelectItem value="menor_preco">Menor preço</SelectItem>
                  <SelectItem value="maior_preco">Maior preço</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                className="lg:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Filters */}
            <aside
              className={`${
                showFilters ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : 'hidden'
              } lg:block lg:relative lg:w-64 lg:flex-shrink-0 lg:bg-transparent lg:p-0`}
            >
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Mobile Close */}
                <div className="flex items-center justify-between lg:hidden mb-6">
                  <h2 className="text-xl font-heading font-bold">Filtros</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Finalidade */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Finalidade</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFilter('finalidade', finalidade === 'venda' ? '' : 'venda')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        finalidade === 'venda'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      Comprar
                    </button>
                    <button
                      onClick={() => updateFilter('finalidade', finalidade === 'aluguel' ? '' : 'aluguel')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        finalidade === 'aluguel'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      Alugar
                    </button>
                  </div>
                </div>

                {/* Tipo */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Tipo de Imóvel</h3>
                  <Select value={tipo || "all"} onValueChange={(v) => updateFilter('tipo', v === "all" ? "" : v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                      <SelectItem value="terreno">Terreno</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cidade */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Cidade</h3>
                  <Select value={cidade || "all"} onValueChange={(v) => updateFilter('cidade', v === "all" ? "" : v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todas</SelectItem>
                      {cidades.map((c) => (
                        <SelectItem key={c.codigo || c.nome} value={c.nome || `cidade-${c.codigo}`}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bairro */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Bairro</h3>
                  <Select value={bairro || "all"} onValueChange={(v) => updateFilter('bairro', v === "all" ? "" : v)} disabled={!cidade}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder={cidade ? "Selecione" : "Selecione a cidade"} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos</SelectItem>
                      {bairros.map((b) => (
                        <SelectItem key={b.codigo || b.nome} value={b.nome || `bairro-${b.codigo}`}>{b.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condomínio */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Condomínio</h3>
                  <Select value={condominioCode || "all"} onValueChange={(v) => updateFilter('condominioCode', v === "all" ? "" : v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Todos os condomínios" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todos</SelectItem>
                      {condominios.map((c) => (
                        <SelectItem key={c.codigo} value={String(c.codigo)}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Faixa de Preço</h3>
                  <div className="px-2">
                    <Slider
                      value={priceRange}
                      onValueChange={(v) => setPriceRange(v as [number, number])}
                      min={0}
                      max={10000000}
                      step={100000}
                      className="my-4"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatPriceLabel(priceRange[0])}</span>
                      <span>{formatPriceLabel(priceRange[1])}</span>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                >
                  Limpar Filtros
                </Button>

                {/* Mobile Apply */}
                <Button
                  variant="gold"
                  className="w-full lg:hidden"
                  onClick={() => setShowFilters(false)}
                >
                  Aplicar Filtros
                </Button>
              </div>
            </aside>

            {/* Property Grid */}
            <div className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property, index) => (
                    <div
                      key={property.codigo}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <PropertyCard property={property} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-xl text-muted-foreground mb-4">
                    Nenhum imóvel encontrado com os filtros selecionados.
                  </p>
                  <Button variant="goldOutline" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
