import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Grid, List, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PropertyCard } from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { mockProperties, getCidades, getBairros, getCondominios } from '@/data/mockProperties';
import { formatCurrency } from '@/lib/formatters';

export default function Imoveis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);

  // Get filter values from URL
  const finalidade = searchParams.get('finalidade') || '';
  const tipo = searchParams.get('tipo') || '';
  const cidade = searchParams.get('cidade') || '';
  const bairro = searchParams.get('bairro') || '';
  const ordenar = searchParams.get('ordenar') || 'recentes';

  const cidades = getCidades();
  const bairros = getBairros(cidade || undefined);
  const condominios = getCondominios();

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = [...mockProperties];

    if (finalidade) {
      result = result.filter(p => p.finalidade === finalidade);
    }
    if (tipo) {
      result = result.filter(p => p.tipo === tipo);
    }
    if (cidade) {
      result = result.filter(p => p.cidade === cidade);
    }
    if (bairro) {
      result = result.filter(p => p.bairro === bairro);
    }
    result = result.filter(p => p.valor >= priceRange[0] && p.valor <= priceRange[1]);

    // Sort
    switch (ordenar) {
      case 'menor_preco':
        result.sort((a, b) => a.valor - b.valor);
        break;
      case 'maior_preco':
        result.sort((a, b) => b.valor - a.valor);
        break;
      default:
        // recentes - keep original order
        break;
    }

    return result;
  }, [finalidade, tipo, cidade, bairro, priceRange, ordenar]);

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
    setPriceRange([0, 5000000]);
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
                {filteredProperties.length} imóveis encontrados
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Sort */}
              <Select value={ordenar} onValueChange={(v) => updateFilter('ordenar', v)}>
                <SelectTrigger className="w-[180px] bg-secondary border-border">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
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
                  <Select value={tipo} onValueChange={(v) => updateFilter('tipo', v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cidade */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Cidade</h3>
                  <Select value={cidade} onValueChange={(v) => updateFilter('cidade', v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {cidades.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bairro */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Bairro</h3>
                  <Select value={bairro} onValueChange={(v) => updateFilter('bairro', v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Todos os bairros" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {bairros.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
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
                      max={5000000}
                      step={50000}
                      className="my-4"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatCurrency(priceRange[0])}</span>
                      <span>{formatCurrency(priceRange[1])}</span>
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
              {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProperties.map((property, index) => (
                    <div
                      key={property.id}
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
