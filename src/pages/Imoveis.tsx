import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyGridSkeleton } from '@/components/PropertyCardSkeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { CondominioMultiSelect } from '@/components/CondominioMultiSelect';
import { useImoveis, useCidades, useBairros, useCondominios } from '@/hooks/useImoveis';
import { getFinalidadeCode, contarImoveisPorCondominio } from '@/services/imoviewApi';
export default function Imoveis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);

  // Get filter values from URL
  const finalidade = searchParams.get('finalidade') || '';
  const tipo = searchParams.get('tipo') || '';
  const cidade = searchParams.get('cidade') || '';
  const bairro = searchParams.get('bairro') || '';
  const condominiosCodes = searchParams.get('condominios') || ''; // Comma-separated list
  const ordenar = searchParams.get('ordenar') || 'recentes';
  const paginaAtual = Number(searchParams.get('pagina')) || 1;
  const busca = searchParams.get('busca') || '';

  // Estado local para o campo de busca (debounced)
  const [searchInput, setSearchInput] = useState(busca);

  // Parse condominios from URL (comma-separated string to array)
  const condominiosArray = useMemo(() => {
    return condominiosCodes ? condominiosCodes.split(',').filter(Boolean) : [];
  }, [condominiosCodes]);

  const finalidadeCode = getFinalidadeCode(finalidade);

  // Fetch data from API
  const { data: cidades = [] } = useCidades(finalidadeCode);
  const { data: bairros = [] } = useBairros(cidade || undefined, finalidadeCode);
  const { data: condominios = [], isLoading: isLoadingCondominios } = useCondominios(cidade || undefined, finalidadeCode);

  // Cache de contagens de imóveis por condomínio
  const [condominiosContagem, setCondominiosContagem] = useState<Record<number, number>>({});
  const [isLoadingContagem, setIsLoadingContagem] = useState(false);

  // Buscar contagem de imóveis para os primeiros 30 condomínios
  useEffect(() => {
    if (condominios.length === 0) return;

    const fetchCounts = async () => {
      setIsLoadingContagem(true);
      
      // Limitar a 30 condomínios para performance
      const condominiosToFetch = condominios.slice(0, 30).filter(
        (c) => condominiosContagem[c.codigo] === undefined
      );

      if (condominiosToFetch.length === 0) {
        setIsLoadingContagem(false);
        return;
      }

      try {
        const counts = await Promise.all(
          condominiosToFetch.map(async (c) => ({
            codigo: c.codigo,
            quantidade: await contarImoveisPorCondominio(c.codigo, finalidadeCode),
          }))
        );

        setCondominiosContagem((prev) => {
          const updated = { ...prev };
          for (const { codigo, quantidade } of counts) {
            updated[codigo] = quantidade;
          }
          return updated;
        });
      } catch (error) {
        console.error('Erro ao buscar contagens:', error);
      } finally {
        setIsLoadingContagem(false);
      }
    };

    fetchCounts();
  }, [condominios, finalidadeCode]);

  // Enriquecer condomínios com contagem
  const condominiosComContagem = useMemo(() => {
    return condominios.map((c) => ({
      ...c,
      quantidadeImoveis: condominiosContagem[c.codigo],
    }));
  }, [condominios, condominiosContagem]);

  const ITEMS_PER_PAGE = 20;

  // Build filters for API call
  const apiFilters = {
    finalidade: finalidadeCode,
    tipo: tipo || undefined,
    cidade: cidade || undefined,
    bairro: bairro || undefined,
    codigosCondominio: condominiosArray.length > 0 ? condominiosArray.map(Number) : undefined,
    valorMin: priceRange[0] > 0 ? priceRange[0] : undefined,
    valorMax: priceRange[1] < 10000000 ? priceRange[1] : undefined,
    ordenarPor: ordenar === 'menor_preco' ? 'valor_asc' : ordenar === 'maior_preco' ? 'valor_desc' : undefined,
    limite: ITEMS_PER_PAGE,
    pagina: paginaAtual,
  };

  const { data: imoveisData, isLoading, error } = useImoveis(apiFilters);
  
  // Filtrar propriedades por busca de texto (local)
  const filteredProperties = useMemo(() => {
    const rawList = imoveisData?.lista || [];
    if (!busca.trim()) return rawList;
    
    const searchLower = busca.toLowerCase().trim();
    return rawList.filter((property) => {
      const searchableFields = [
        property.titulo,
        property.descricao,
        property.endereco,
        property.bairro,
        property.cidade,
        property.condominio,
        property.tipo,
        String(property.codigo),
        String(property.codigoReferencia),
      ].filter(Boolean);
      
      return searchableFields.some((field) => 
        String(field).toLowerCase().includes(searchLower)
      );
    });
  }, [imoveisData?.lista, busca]);

  const properties = filteredProperties;
  const totalImoveis = busca.trim() ? filteredProperties.length : (imoveisData?.quantidade || 0);
  const totalPages = Math.ceil(totalImoveis / ITEMS_PER_PAGE);

  // Determina se há mais páginas baseado no total real
  const hasMorePages = paginaAtual < totalPages;
  const hasPreviousPage = paginaAtual > 1;

  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== busca) {
        updateFilter('busca', searchInput);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const goToPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (page > 1) {
      newParams.set('pagina', String(page));
    } else {
      newParams.delete('pagina');
    }
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    setSearchInput('');
  };

  // Reset página quando filtros mudam
  useEffect(() => {
    if (paginaAtual > 1) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('pagina');
      setSearchParams(newParams);
    }
  }, [finalidade, tipo, cidade, bairro, condominiosCodes, ordenar, busca]);

  // Handler for updating condominios (multi-select)
  const updateCondominios = (values: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (values.length > 0) {
      newParams.set('condominios', values.join(','));
    } else {
      newParams.delete('condominios');
    }
    newParams.delete('pagina'); // Reset page on filter change
    setSearchParams(newParams);
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

  // Encontrar nomes dos condomínios selecionados
  const selectedCondominiosNames = useMemo(() => {
    if (condominiosArray.length === 0) return null;
    
    const selected = condominiosComContagem.filter((c) =>
      condominiosArray.includes(String(c.codigo))
    );
    
    if (selected.length === 0) return null;
    if (selected.length === 1) return selected[0].nome;
    if (selected.length === 2) return `${selected[0].nome} e ${selected[1].nome}`;
    return `${selected[0].nome}, ${selected[1].nome} e mais ${selected.length - 2}`;
  }, [condominiosArray, condominiosComContagem]);

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
              {selectedCondominiosNames && (
                <p className="text-lg text-primary font-medium mb-1">
                  {selectedCondominiosNames}
                </p>
              )}
              <p className="text-muted-foreground">
                {isLoading ? 'Carregando...' : `${totalImoveis} imóveis encontrados`}
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

                {/* Busca por texto */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Buscar</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Endereço, bairro, condomínio..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9 bg-secondary border-border"
                      maxLength={100}
                    />
                    {searchInput && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                        onClick={() => {
                          setSearchInput('');
                          updateFilter('busca', '');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
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

                {/* Condomínios (Multi-Select) */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Condomínios</h3>
                  <CondominioMultiSelect
                    condominios={condominiosComContagem}
                    values={condominiosArray}
                    onValuesChange={updateCondominios}
                    placeholder="Todos os condomínios"
                    isLoading={isLoadingCondominios || isLoadingContagem}
                    triggerClassName="bg-secondary border-border"
                    maxSelections={10}
                  />
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
                <PropertyGridSkeleton count={6} />
              ) : properties.length > 0 ? (
                <>
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

                  {/* Pagination Controls */}
                  {(hasPreviousPage || hasMorePages) && (
                    <div className="flex items-center justify-center gap-4 mt-12">
                      <Button
                        variant="outline"
                        onClick={() => goToPage(paginaAtual - 1)}
                        disabled={!hasPreviousPage}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      
                      <span className="px-4 py-2 rounded-lg bg-secondary text-foreground font-medium">
                        Página {paginaAtual} de {totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        onClick={() => goToPage(paginaAtual + 1)}
                        disabled={!hasMorePages}
                        className="gap-2"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
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
