import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Search, List, MapIcon, Plus, Building2, BedDouble, Bath, Ruler } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyGridSkeleton } from '@/components/PropertyCardSkeleton';
import { PropertyMap } from '@/components/PropertyMap';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { CondominioMultiSelect } from '@/components/CondominioMultiSelect';
import { BairroMultiSelect } from '@/components/BairroMultiSelect';
import { CidadeMultiSelect } from '@/components/CidadeMultiSelect';
import { useImoveis, useImoveisRecentes, useBairrosMultiCidade, useCondominiosSlimMultiCidade, useCondominiosPorBairro } from '@/hooks/useImoveis';
import { useFiltrosIniciais } from '@/hooks/useFiltrosIniciais';
import { useImoveisMap } from '@/hooks/useImoveisMap';
import { getFinalidadeCode } from '@/services/imoviewApi';
export default function Imoveis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Get filter values from URL
  const finalidade = searchParams.get('finalidade') || '';
  const tipo = searchParams.get('tipo') || '';
  const cidadesParam = searchParams.get('cidades') || ''; // Comma-separated list of city names
  const cidadeSingular = searchParams.get('cidade') || ''; // Retrocompatibilidade: parâmetro singular
  const bairrosParam = searchParams.get('bairros') || ''; // Comma-separated list of bairro names
  const condominiosCodes = searchParams.get('condominios') || ''; // Comma-separated list
  const ordenar = searchParams.get('ordenar') || 'recentes';
  const paginaAtual = Number(searchParams.get('pagina')) || 1;
  const busca = searchParams.get('busca') || '';
const valorMinUrl = searchParams.get('valorMin');
const valorMaxUrl = searchParams.get('valorMax');
const quartosUrl = searchParams.get('quartos') || '';
const banheirosUrl = searchParams.get('banheiros') || '';
const areaMinUrl = searchParams.get('areaMin') || '';
const precoM2MinUrl = searchParams.get('precoM2Min') || '';
const precoM2MaxUrl = searchParams.get('precoM2Max') || '';

  // Parse cidades from URL (comma-separated string to array) com fallback para parâmetro singular
  const cidadesArray = useMemo(() => {
    if (cidadesParam) return cidadesParam.split(',').filter(Boolean);
    if (cidadeSingular) return [cidadeSingular]; // Fallback: cidade singular -> array
    return [];
  }, [cidadesParam, cidadeSingular]);

  // Initialize priceRange from URL values
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = valorMinUrl ? Number(valorMinUrl) : 0;
    const max = valorMaxUrl ? Number(valorMaxUrl) : 10000000;
    return [min, max];
  });

  // Sync priceRange when URL changes (e.g., navigation from HeroSection)
  useEffect(() => {
    const min = valorMinUrl ? Number(valorMinUrl) : 0;
    const max = valorMaxUrl ? Number(valorMaxUrl) : 10000000;
    setPriceRange([min, max]);
  }, [valorMinUrl, valorMaxUrl]);

  // Estado local para o campo de busca (debounced)
  const [searchInput, setSearchInput] = useState(busca);

  // Parse condominios from URL (comma-separated string to array)
  const condominiosArray = useMemo(() => {
    return condominiosCodes ? condominiosCodes.split(',').filter(Boolean) : [];
  }, [condominiosCodes]);

  // Parse bairros from URL (comma-separated string to array)
  const bairrosArray = useMemo(() => {
    return bairrosParam ? bairrosParam.split(',').filter(Boolean) : [];
  }, [bairrosParam]);

  const finalidadeCode = getFinalidadeCode(finalidade);

  // Carregar filtros iniciais (cidades + tipos) em uma única chamada
  const { data: filtrosIniciais, isLoading: isLoadingFiltros } = useFiltrosIniciais(finalidadeCode);
  const cidadesDisponiveis = filtrosIniciais?.cidades || [];
  
  // Converter nomes de cidade para códigos (API filtra melhor por código)
  const codigosCidades = useMemo(() => {
    if (cidadesArray.length === 0) return undefined;
    const codigos = cidadesArray.map(nome => {
      const cidadeEncontrada = cidadesDisponiveis.find(c => c.nome.toLowerCase() === nome.toLowerCase());
      return cidadeEncontrada?.codigo;
    }).filter((c): c is number => c !== undefined);
    return codigos.length > 0 ? codigos : undefined;
  }, [cidadesArray, cidadesDisponiveis]);

  // Para compatibilidade com API (primeiro código de cidade ou undefined)
  const codigoCidadePrincipal = codigosCidades?.[0];

  // Buscar bairros usando múltiplas cidades (lazy loading - só quando tem cidade)
  const { data: bairros = [], isLoading: isLoadingBairros } = useBairrosMultiCidade(
    cidadesArray.length > 0 ? cidadesArray : undefined,
    codigosCidades,
    finalidadeCode
  );
  
  // Usar versão slim dos condomínios para múltiplas cidades
  const { data: condominios = [], isLoading: isLoadingCondominios } = useCondominiosSlimMultiCidade(
    cidadesArray,
    codigosCidades,
    finalidadeCode
  );

  // Converter nomes de bairros para códigos (API filtra melhor por código)
  const codigosBairros = useMemo(() => {
    if (bairrosArray.length === 0) return undefined;
    const codigos = bairrosArray.map(nome => {
      const bairroEncontrado = bairros.find(b => b.nome.toLowerCase() === nome.toLowerCase());
      return bairroEncontrado?.codigo;
    }).filter((c): c is number => c !== undefined);
    if (import.meta.env.DEV) {
      console.log(`[Imoveis] Bairros "${bairrosArray.join(', ')}" -> códigos: ${codigos.join(', ')}`);
    }
    return codigos.length > 0 ? codigos : undefined;
  }, [bairrosArray, bairros]);

  // Buscar condomínios que têm imóveis nos bairros selecionados
  const { data: condominiosDoBairro = [], isLoading: isLoadingCondominiosDoBairro } = useCondominiosPorBairro(
    codigosBairros,
    codigoCidadePrincipal,
    finalidadeCode
  );

  // OTIMIZAÇÃO: Removido loop de contagem individual de condomínios (causava 30+ requests)
  // A contagem agora vem do useCondominiosPorBairro quando bairros estão selecionados

  // Enriquecer condomínios com contagem (do useCondominiosPorBairro quando disponível)
  const condominiosComContagem = useMemo(() => {
    // Criar mapa de contagem do condominiosDoBairro
    const contagemMap = new Map<number, number>();
    for (const c of condominiosDoBairro) {
      contagemMap.set(c.codigo, c.quantidadeImoveis);
    }
    
    return condominios.map((c) => ({
      ...c,
      quantidadeImoveis: contagemMap.get(c.codigo),
    }));
  }, [condominios, condominiosDoBairro]);

  const ITEMS_PER_PAGE = 20;

  // Debug só ativado via ?debug=1 na URL
  const debugEnabled =
    searchParams.get('debug') === '1' ||
    searchParams.get('debug') === 'true';

  // Build filters for API call - use URL values directly for reliability
  const valorMinFiltro = valorMinUrl ? Number(valorMinUrl) : (priceRange[0] > 0 ? priceRange[0] : undefined);
  const valorMaxFiltro = valorMaxUrl ? Number(valorMaxUrl) : (priceRange[1] < 10000000 ? priceRange[1] : undefined);
  
  // API Imoview funciona melhor com códigos numéricos para cidade e bairro
  const apiFilters = {
    finalidade: finalidadeCode,
    tipo: tipo || undefined,
    cidades: cidadesArray.length > 0 ? cidadesArray : undefined,
    codigosCidades: codigosCidades,
    bairros: bairrosArray.length > 0 ? bairrosArray : undefined,
    codigosBairros: codigosBairros, // Códigos numéricos dos bairros (funciona melhor na API)
    codigosCondominio: condominiosArray.length > 0 ? condominiosArray.map(Number) : undefined,
    valorMin: valorMinFiltro,
    valorMax: valorMaxFiltro,
    quartos: quartosUrl ? Number(quartosUrl) : undefined,
    banheiros: banheirosUrl ? Number(banheirosUrl) : undefined,
    areaMin: areaMinUrl ? Number(areaMinUrl) : undefined,
    ordenarPor: ordenar === 'menor_preco' ? 'valor_asc' : ordenar === 'maior_preco' ? 'valor_desc' : 'data_desc', // menor_m2/maior_m2 fallback to data_desc (client-side sort)
    limite: ITEMS_PER_PAGE,
    pagina: paginaAtual,
  };

  const apiFiltersDebug = useMemo(
    () => JSON.stringify(apiFilters, null, 2),
    [
      finalidadeCode,
      tipo,
      cidadesArray,
      codigosCidades,
      bairrosArray,
      codigosBairros,
      condominiosCodes,
      valorMinFiltro,
      valorMaxFiltro,
      ordenar,
      paginaAtual,
    ]
  );

  useEffect(() => {
    if (debugEnabled) {
      console.log('[Imoveis] Filtros da API:', apiFiltersDebug);
    }
  }, [debugEnabled, apiFiltersDebug]);

  // Mapeamento de tipo (texto) para código numérico da API
  const tipoParaCodigo = (tipoStr?: string): number | undefined => {
    if (!tipoStr) return undefined;
    const tipoLower = tipoStr.toLowerCase();
    // Mapeamento baseado nos tipos comuns da API Imoview
    const mapa: Record<string, number> = {
      'casa': 1,
      'apartamento': 2,
      'terreno': 19,        // Código correto da API Imoview
      'comercial': 6,       // Código correto da API Imoview
      'casa_condominio': 28, // Código correto da API Imoview
    };
    return mapa[tipoLower];
  };

  // Determinar se podemos usar o endpoint de "recentes" (menos filtros complexos)
  // O endpoint RetornarImoveisAlterados suporta: finalidade, codigoCidade, codigoTipo
  // Não suporta: bairros, condominios, faixa de preço, busca de texto, quartos, banheiros, área
  const hasAdvancedFilters = useMemo(() => {
    return (
      bairrosArray.length > 0 ||
      condominiosArray.length > 0 ||
      valorMinFiltro !== undefined ||
      valorMaxFiltro !== undefined ||
      quartosUrl !== '' ||
      banheirosUrl !== '' ||
      areaMinUrl !== '' ||
      precoM2MinUrl !== '' ||
      precoM2MaxUrl !== '' ||
      busca.trim() !== ''
    );
  }, [bairrosArray, condominiosArray, valorMinFiltro, valorMaxFiltro, quartosUrl, banheirosUrl, areaMinUrl, precoM2MinUrl, precoM2MaxUrl, busca]);

  // Usar endpoint de "recentes" quando ordenar=recentes E sem filtros avançados
  // Ordenações por R$/m² são client-side, então precisam do endpoint geral
  const useRecentesEndpoint = ordenar === 'recentes' && !hasAdvancedFilters;

  // Hook para imóveis recentes (quando apropriado)
  const recentesFilters = useMemo(() => ({
    finalidade: finalidadeCode,
    codigoCidade: codigoCidadePrincipal,
    codigoTipo: tipoParaCodigo(tipo),
    pagina: paginaAtual,
    limite: ITEMS_PER_PAGE,
    diasAtras: 365, // Buscar últimos 365 dias para cobrir bem o histórico
  }), [finalidadeCode, codigoCidadePrincipal, tipo, paginaAtual]);

  const { 
    data: imoveisRecentesData, 
    isLoading: isLoadingRecentes 
  } = useImoveisRecentes(useRecentesEndpoint ? recentesFilters : { limite: 0 });

  // Hook para imóveis gerais (quando há filtros avançados ou ordenação por preço)
  const { 
    data: imoveisGeralData, 
    isLoading: isLoadingGeral 
  } = useImoveis(!useRecentesEndpoint ? apiFilters : { limite: 0 });

  // Unificar dados baseado no endpoint usado
  const imoveisData = useRecentesEndpoint ? imoveisRecentesData : imoveisGeralData;
  const isLoadingBase = useRecentesEndpoint ? isLoadingRecentes : isLoadingGeral;

  // Build filters for map (without pagination)
  const mapFilters = {
    finalidade: finalidadeCode,
    tipo: tipo || undefined,
    cidades: cidadesArray.length > 0 ? cidadesArray : undefined,
    codigosCidades: codigosCidades,
    bairros: bairrosArray.length > 0 ? bairrosArray : undefined,
    codigosBairros: codigosBairros,
    codigosCondominio: condominiosArray.length > 0 ? condominiosArray.map(Number) : undefined,
    valorMin: valorMinFiltro,
    valorMax: valorMaxFiltro,
    quartos: quartosUrl ? Number(quartosUrl) : undefined,
    banheiros: banheirosUrl ? Number(banheirosUrl) : undefined,
    areaMin: areaMinUrl ? Number(areaMinUrl) : undefined,
    ordenarPor: ordenar === 'menor_preco' ? 'valor_asc' : ordenar === 'maior_preco' ? 'valor_desc' : 'data_desc',
  };

  // Flag: ordenação por R$/m² requer todos os imóveis (client-side sort)
  const isM2Sort = ordenar === 'menor_m2' || ordenar === 'maior_m2';

  // Flag: filtros client-side (API não suporta nativamente)
  const hasClientSideFilters = !!(quartosUrl || banheirosUrl || areaMinUrl || precoM2MinUrl || precoM2MaxUrl);

  // Buscar TODOS os imóveis quando: mapa, ordenação R$/m², ou filtros client-side
  const needsFullDataset = viewMode === 'map' || isM2Sort || hasClientSideFilters;
  const { data: mapProperties = [], isLoading: isLoadingMap } = useImoveisMap(mapFilters, needsFullDataset);
  
  // Loading: quando usando dataset completo, depende do carregamento de todos os imóveis
  const isLoading = (isM2Sort || hasClientSideFilters) ? isLoadingMap : isLoadingBase;
  
  // Normalizar filtro de tipo para garantir que sempre seja aplicado (mesmo se a API ignorar)
  const tipoFiltro = tipo.trim();
  const tipoFiltroLower = tipoFiltro.toLowerCase();

  const matchesTipoFiltro = useCallback(
    (propertyTipo?: string) => {
      if (!tipoFiltroLower) return true;
      const t = (propertyTipo ?? '').toLowerCase();

      // Casa de Condomínio: casa em condomínio fechado
      if (tipoFiltroLower === 'casa_condominio') {
        return t.includes('casa') && (t.includes('condomínio') || t.includes('condominio'));
      }

      // Casa (excluindo casas de condomínio se for filtro específico)
      if (tipoFiltroLower === 'casa') return t.includes('casa');

      // Apartamento: inclui variações comuns que não contém a palavra "apartamento"
      if (tipoFiltroLower === 'apartamento') {
        return (
          t.includes('apartamento') ||
          t.includes('cobertura') ||
          t.includes('studio') ||
          t.includes('flat')
        );
      }

      // Terreno / Lote
      if (tipoFiltroLower === 'terreno') return t.includes('terreno') || t.includes('lote');

      // Comercial (variações comuns)
      if (tipoFiltroLower === 'comercial') {
        return (
          t.includes('comercial') ||
          t.includes('loja') ||
          t.includes('sala') ||
          t.includes('galp') ||
          t.includes('barrac') ||
          t.includes('predio') ||
          t.includes('prédio') ||
          t.includes('area') ||
          t.includes('área')
        );
      }

      // Fallback: contém o texto do filtro
      return t.includes(tipoFiltroLower);
    },
    [tipoFiltroLower]
  );

  // Filtrar propriedades por tipo e busca de texto (local) + ordenar (cliente)
  const filteredProperties = useMemo(() => {
    // Só aplica ordenação local se não estiver usando endpoint de recentes
    // (o endpoint de recentes já retorna ordenado por data de alteração)
    const calcPrecoM2 = (p: { valor?: number | null; valorM2?: number | null; areaTotal?: number | null; areaConstruida?: number | null }) => {
      if (p.valorM2 && p.valorM2 > 0) return p.valorM2;
      const area = p.areaConstruida || p.areaTotal || 0;
      return area > 0 && p.valor ? p.valor / area : 0;
    };

    const applyOrdering = <T extends { valor?: number | null; areaTotal?: number | null; areaConstruida?: number | null }>(arr: T[]) => {
      if (ordenar === 'menor_preco') {
        return [...arr].sort((a, b) => (a.valor ?? 0) - (b.valor ?? 0));
      }
      if (ordenar === 'maior_preco') {
        return [...arr].sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
      }
      if (ordenar === 'menor_m2') {
        return [...arr].sort((a, b) => {
          const am2 = calcPrecoM2(a);
          const bm2 = calcPrecoM2(b);
          if (am2 <= 0 && bm2 <= 0) return 0;
          if (am2 <= 0) return 1;
          if (bm2 <= 0) return -1;
          return am2 - bm2;
        });
      }
      if (ordenar === 'maior_m2') {
        return [...arr].sort((a, b) => {
          const am2 = calcPrecoM2(a);
          const bm2 = calcPrecoM2(b);
          if (am2 <= 0 && bm2 <= 0) return 0;
          if (am2 <= 0) return 1;
          if (bm2 <= 0) return -1;
          return bm2 - am2;
        });
      }
      // Se ordenar=recentes E usando endpoint de recentes, não re-ordena (já vem correto)
      return arr;
    };

    // Quando ordenação por R$/m² ou filtros client-side estão ativos, usar todos os imóveis (mapProperties)
    const sourceList = (isM2Sort || hasClientSideFilters) ? (mapProperties || []) : (imoveisData?.lista || []);
    let list = sourceList.filter((property) => matchesTipoFiltro(property.tipo));

    // Filtro local de quartos (caso API não suporte)
    if (quartosUrl) {
      const minQuartos = Number(quartosUrl);
      list = list.filter((property) => (property.qtdeQuartos ?? 0) >= minQuartos);
    }

    // Filtro local de banheiros (caso API não suporte)
    if (banheirosUrl) {
      const minBanheiros = Number(banheirosUrl);
      list = list.filter((property) => (property.qtdeBanheiros ?? 0) >= minBanheiros);
    }

    // Filtro local de área mínima (caso API não suporte)
    if (areaMinUrl) {
      const minArea = Number(areaMinUrl);
      list = list.filter((property) => (property.areaTotal ?? property.areaConstruida ?? 0) >= minArea);
    }

    if (busca.trim()) {
      const searchLower = busca.toLowerCase().trim();
      list = list.filter((property) => {
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

        return searchableFields.some((field) => String(field).toLowerCase().includes(searchLower));
      });
    }

    // Filtro local de preço por m²
    if (precoM2MinUrl || precoM2MaxUrl) {
      const minM2 = precoM2MinUrl ? Number(precoM2MinUrl) : 0;
      const maxM2 = precoM2MaxUrl ? Number(precoM2MaxUrl) : Infinity;
      list = list.filter((property) => {
        const pm2 = calcPrecoM2(property);
        if (pm2 <= 0) return false;
        return pm2 >= minM2 && pm2 <= maxM2;
      });
    }

    return applyOrdering(list);
  }, [imoveisData?.lista, mapProperties, isM2Sort, hasClientSideFilters, busca, matchesTipoFiltro, ordenar, quartosUrl, banheirosUrl, areaMinUrl, precoM2MinUrl, precoM2MaxUrl]);

  // Calcular média de R$/m² por bairro (para badge "abaixo da média")
  const mediasPrecoM2PorBairro = useMemo(() => {
    const source = imoveisData?.lista || [];
    const getPrecoM2 = (p: { valor?: number | null; valorM2?: number | null; areaConstruida?: number | null; areaTotal?: number | null }) => {
      if (p.valorM2 && p.valorM2 > 0) return p.valorM2;
      const area = p.areaConstruida || p.areaTotal || 0;
      return area > 0 && p.valor ? p.valor / area : 0;
    };
    const bairroMap = new Map<string, { soma: number; count: number }>();
    for (const p of source) {
      const bairro = p.bairro;
      if (!bairro) continue;
      const precoM2 = getPrecoM2(p);
      if (precoM2 <= 0) continue;
      const entry = bairroMap.get(bairro);
      if (entry) {
        entry.soma += precoM2;
        entry.count += 1;
      } else {
        bairroMap.set(bairro, { soma: precoM2, count: 1 });
      }
    }
    const result = new Map<string, number>();
    for (const [bairro, { soma, count }] of bairroMap) {
      if (count >= 2) { // Só calcula média com pelo menos 2 imóveis no bairro
        result.set(bairro, soma / count);
      }
    }
    return result;
  }, [imoveisData?.lista]);

  const filteredMapProperties = useMemo(() => {
    let list = (mapProperties || []).filter((property) => matchesTipoFiltro(property.tipo));

    // Filtro local de quartos (caso API não suporte)
    if (quartosUrl) {
      const minQuartos = Number(quartosUrl);
      list = list.filter((property) => (property.qtdeQuartos ?? 0) >= minQuartos);
    }

    // Filtro local de banheiros (caso API não suporte)
    if (banheirosUrl) {
      const minBanheiros = Number(banheirosUrl);
      list = list.filter((property) => (property.qtdeBanheiros ?? 0) >= minBanheiros);
    }

    // Filtro local de área mínima (caso API não suporte)
    if (areaMinUrl) {
      const minArea = Number(areaMinUrl);
      list = list.filter((property) => (property.areaTotal ?? property.areaConstruida ?? 0) >= minArea);
    }

    const calcPrecoM2Map = (p: { valor?: number | null; valorM2?: number | null; areaTotal?: number | null; areaConstruida?: number | null }) => {
      if (p.valorM2 && p.valorM2 > 0) return p.valorM2;
      const area = p.areaConstruida || p.areaTotal || 0;
      return area > 0 && p.valor ? p.valor / area : 0;
    };

    // Filtro local de preço por m²
    if (precoM2MinUrl || precoM2MaxUrl) {
      const minM2 = precoM2MinUrl ? Number(precoM2MinUrl) : 0;
      const maxM2 = precoM2MaxUrl ? Number(precoM2MaxUrl) : Infinity;
      list = list.filter((property) => {
        const pm2 = calcPrecoM2Map(property);
        if (pm2 <= 0) return false;
        return pm2 >= minM2 && pm2 <= maxM2;
      });
    }

    if (ordenar === 'menor_preco') {
      return [...list].sort((a, b) => (a.valor ?? 0) - (b.valor ?? 0));
    }
    if (ordenar === 'maior_preco') {
      return [...list].sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
    }
    if (ordenar === 'menor_m2') {
      return [...list].sort((a, b) => {
        const am2 = calcPrecoM2Map(a);
        const bm2 = calcPrecoM2Map(b);
        if (am2 <= 0 && bm2 <= 0) return 0;
        if (am2 <= 0) return 1;
        if (bm2 <= 0) return -1;
        return am2 - bm2;
      });
    }
    if (ordenar === 'maior_m2') {
      return [...list].sort((a, b) => {
        const am2 = calcPrecoM2Map(a);
        const bm2 = calcPrecoM2Map(b);
        if (am2 <= 0 && bm2 <= 0) return 0;
        if (am2 <= 0) return 1;
        if (bm2 <= 0) return -1;
        return bm2 - am2;
      });
    }

    return list;
  }, [mapProperties, matchesTipoFiltro, ordenar, quartosUrl, banheirosUrl, areaMinUrl, precoM2MinUrl, precoM2MaxUrl]);

  // Quando isM2Sort ou hasClientSideFilters, paginar no cliente (filteredProperties tem TODOS os imóveis filtrados/ordenados)
  const useClientPagination = isM2Sort || hasClientSideFilters;
  const properties = useClientPagination
    ? filteredProperties.slice((paginaAtual - 1) * ITEMS_PER_PAGE, paginaAtual * ITEMS_PER_PAGE)
    : filteredProperties;
  const totalImoveis = (useClientPagination || busca.trim()) ? filteredProperties.length : (imoveisData?.quantidade || 0);
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

  // Reset bairros/condomínios quando as cidades REALMENTE mudam (não no primeiro load)
  const prevCidadesRef = useRef<string>('');
  useEffect(() => {
    const currentCidadesStr = cidadesArray.join(',');
    const prev = prevCidadesRef.current;
    prevCidadesRef.current = currentCidadesStr;

    // Se ainda não havia cidades (primeiro render), não mexe na URL
    if (!prev) return;

    if (currentCidadesStr && prev !== currentCidadesStr) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('bairros');
      newParams.delete('condominios');
      newParams.delete('pagina');
      setSearchParams(newParams);
    }
  }, [cidadesArray, searchParams, setSearchParams]);

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
  }, [finalidade, tipo, cidadesParam, bairrosParam, condominiosCodes, ordenar, busca]);

  // Handler for updating cidades (multi-select)
  const updateCidades = (values: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (values.length > 0) {
      newParams.set('cidades', values.join(','));
    } else {
      newParams.delete('cidades');
    }
    // Reset bairros e condomínios quando cidades mudam
    newParams.delete('bairros');
    newParams.delete('condominios');
    newParams.delete('pagina');
    setSearchParams(newParams);
  };

  // Handler for updating bairros (multi-select)
  const updateBairros = (values: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (values.length > 0) {
      newParams.set('bairros', values.join(','));
    } else {
      newParams.delete('bairros');
    }
    newParams.delete('pagina'); // Reset page on filter change
    setSearchParams(newParams);
  };

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
    const tipoLower = tipo?.toLowerCase();
    if (tipoLower === 'casa') parts.push('Casas');
    else if (tipoLower === 'apartamento') parts.push('Apartamentos');
    else if (tipoLower === 'terreno') parts.push('Terrenos');
    else if (tipoLower === 'comercial') parts.push('Imóveis Comerciais');
    else parts.push('Imóveis');

    if (finalidade === 'venda') parts.push('à Venda');
    else if (finalidade === 'aluguel') parts.push('para Alugar');

    if (cidadesArray.length === 1) parts.push(`em ${cidadesArray[0]}`);
    else if (cidadesArray.length > 1) parts.push(`em ${cidadesArray.length} cidades`);
    if (bairrosArray.length === 1) parts.push(`- ${bairrosArray[0]}`);
    else if (bairrosArray.length > 1) parts.push(`- ${bairrosArray.length} bairros`);

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
              {/* Debug (dev ou ativado via ?debug=1) */}
              {debugEnabled && (
                <details className="mt-2 text-xs text-muted-foreground/70 font-mono">
                  <summary className="cursor-pointer hover:text-muted-foreground">
                    Debug: {useRecentesEndpoint ? '🚀 Endpoint RECENTES' : '📋 Endpoint GERAL'}
                  </summary>
                  <pre className="mt-1 p-2 bg-secondary/50 rounded text-[10px] overflow-auto max-h-32">
                    Endpoint: {useRecentesEndpoint ? 'RetornarImoveisAlterados (ordenado por data)' : 'RetornarImoveisDisponiveis (geral)'}
                    {'\n'}Filtros avançados: {hasAdvancedFilters ? 'SIM' : 'NÃO'}
                    {'\n\n'}{apiFiltersDebug}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-4 w-4" />
                  Lista
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'map'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MapIcon className="h-4 w-4" />
                  Mapa
                </button>
              </div>

              {/* Sort */}
              <Select value={ordenar} onValueChange={(v) => updateFilter('ordenar', v)}>
                <SelectTrigger className="w-[180px] bg-secondary border-border">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="recentes">Mais recentes</SelectItem>
                  <SelectItem value="menor_preco">Menor preço</SelectItem>
                  <SelectItem value="maior_preco">Maior preço</SelectItem>
                  <SelectItem value="menor_m2">Menor R$/m²</SelectItem>
                  <SelectItem value="maior_m2">Maior R$/m²</SelectItem>
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
                      <SelectItem value="Casa">Casa</SelectItem>
                      <SelectItem value="casa_condominio">Casa de Condomínio</SelectItem>
                      <SelectItem value="Apartamento">Apartamento</SelectItem>
                      <SelectItem value="Terreno">Terreno</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cidade (Multi-Select) */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Cidades</h3>
                  <CidadeMultiSelect
                    cidades={cidadesDisponiveis}
                    values={cidadesArray}
                    onValuesChange={updateCidades}
                    placeholder="Todas as cidades"
                    isLoading={isLoadingFiltros}
                    triggerClassName="bg-secondary border-border"
                    maxSelections={10}
                  />
                </div>

                {/* Bairros (Multi-Select) */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Bairros</h3>
                  <BairroMultiSelect
                    bairros={bairros}
                    values={bairrosArray}
                    onValuesChange={updateBairros}
                    placeholder={cidadesArray.length > 0 ? "Todos os bairros" : "Selecione uma cidade"}
                    disabled={cidadesArray.length === 0}
                    isLoading={isLoadingBairros}
                    triggerClassName="bg-secondary border-border"
                    maxSelections={50}
                  />
                </div>

                {/* Condomínios (Multi-Select) */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Condomínios</h3>
                  
                  {/* Mostrar condomínios dos bairros selecionados */}
                  {condominiosDoBairro.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Building2 className="h-4 w-4" />
                        <span>Condomínios no{bairrosArray.length > 1 ? 's bairros' : ' bairro'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {condominiosDoBairro.length} condomínio{condominiosDoBairro.length > 1 ? 's' : ''} encontrado{condominiosDoBairro.length > 1 ? 's' : ''} em {bairrosArray.join(', ')}
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {condominiosDoBairro.map((cond) => {
                          const isSelected = condominiosArray.includes(String(cond.codigo));
                          return (
                            <button
                              key={cond.codigo}
                              onClick={() => {
                                if (isSelected) {
                                  updateCondominios(condominiosArray.filter(c => c !== String(cond.codigo)));
                                } else {
                                  updateCondominios([...condominiosArray, String(cond.codigo)]);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-primary/20'
                              }`}
                            >
                              {!isSelected && <Plus className="h-3 w-3" />}
                              {cond.nome}
                              <span className="opacity-70">({cond.quantidadeImoveis})</span>
                            </button>
                          );
                        })}
                      </div>
                      {condominiosDoBairro.length > 0 && condominiosDoBairro.some(c => !condominiosArray.includes(String(c.codigo))) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => {
                            const newCodigos = condominiosDoBairro
                              .map(c => String(c.codigo))
                              .filter(codigo => !condominiosArray.includes(codigo));
                            updateCondominios([...condominiosArray, ...newCodigos].slice(0, 50));
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar todos os condomínios do bairro
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {isLoadingCondominiosDoBairro && bairrosArray.length > 0 && (
                    <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground animate-pulse">
                      Buscando condomínios nos bairros...
                    </div>
                  )}
                  
                  <CondominioMultiSelect
                    condominios={condominiosComContagem}
                    values={condominiosArray}
                    onValuesChange={updateCondominios}
                    placeholder="Todos os condomínios"
                    isLoading={isLoadingCondominios || isLoadingCondominiosDoBairro}
                    triggerClassName="bg-secondary border-border"
                    maxSelections={50}
                  />
                </div>

                {/* Quartos */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Quartos</h3>
                  <Select 
                    value={quartosUrl || "all"} 
                    onValueChange={(v) => updateFilter('quartos', v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <BedDouble className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Qualquer" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="1">1+ quarto</SelectItem>
                      <SelectItem value="2">2+ quartos</SelectItem>
                      <SelectItem value="3">3+ quartos</SelectItem>
                      <SelectItem value="4">4+ quartos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Banheiros */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Banheiros</h3>
                  <Select 
                    value={banheirosUrl || "all"} 
                    onValueChange={(v) => updateFilter('banheiros', v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <Bath className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Qualquer" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="1">1+ banheiro</SelectItem>
                      <SelectItem value="2">2+ banheiros</SelectItem>
                      <SelectItem value="3">3+ banheiros</SelectItem>
                      <SelectItem value="4">4+ banheiros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Área Mínima */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Área Mínima</h3>
                  <Select 
                    value={areaMinUrl || "all"} 
                    onValueChange={(v) => updateFilter('areaMin', v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <Ruler className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Qualquer" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="50">50+ m²</SelectItem>
                      <SelectItem value="100">100+ m²</SelectItem>
                      <SelectItem value="150">150+ m²</SelectItem>
                      <SelectItem value="200">200+ m²</SelectItem>
                      <SelectItem value="300">300+ m²</SelectItem>
                      <SelectItem value="500">500+ m²</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Faixa de Preço</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Mínimo</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={priceRange[0] > 0 ? priceRange[0].toLocaleString('pt-BR') : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              const numValue = value ? Number(value) : 0;
                              setPriceRange([numValue, priceRange[1]]);
                            }}
                            onBlur={() => {
                              const newParams = new URLSearchParams(searchParams);
                              if (priceRange[0] > 0) {
                                newParams.set('valorMin', String(priceRange[0]));
                              } else {
                                newParams.delete('valorMin');
                              }
                              newParams.delete('pagina');
                              setSearchParams(newParams);
                            }}
                            className="pl-9 bg-secondary border-border"
                          />
                        </div>
                      </div>
                      <span className="text-muted-foreground mt-5">-</span>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Máximo</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Sem limite"
                            value={priceRange[1] < 10000000 ? priceRange[1].toLocaleString('pt-BR') : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              const numValue = value ? Number(value) : 10000000;
                              setPriceRange([priceRange[0], numValue]);
                            }}
                            onBlur={() => {
                              const newParams = new URLSearchParams(searchParams);
                              if (priceRange[1] < 10000000) {
                                newParams.set('valorMax', String(priceRange[1]));
                              } else {
                                newParams.delete('valorMax');
                              }
                              newParams.delete('pagina');
                              setSearchParams(newParams);
                            }}
                            className="pl-9 bg-secondary border-border"
                          />
                        </div>
                      </div>
                    </div>
                    <Slider
                      value={priceRange}
                      onValueChange={(v) => setPriceRange(v as [number, number])}
                      onValueCommit={(v) => {
                        const values = v as [number, number];
                        const newParams = new URLSearchParams(searchParams);
                        if (values[0] > 0) {
                          newParams.set('valorMin', String(values[0]));
                        } else {
                          newParams.delete('valorMin');
                        }
                        if (values[1] < 10000000) {
                          newParams.set('valorMax', String(values[1]));
                        } else {
                          newParams.delete('valorMax');
                        }
                        newParams.delete('pagina');
                        setSearchParams(newParams);
                      }}
                      min={0}
                      max={10000000}
                      step={100000}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Preço por m² */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Preço por m²</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Mínimo</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">R$/m²</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={precoM2MinUrl ? Number(precoM2MinUrl).toLocaleString('pt-BR') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            const newParams = new URLSearchParams(searchParams);
                            if (value) {
                              newParams.set('precoM2Min', value);
                            } else {
                              newParams.delete('precoM2Min');
                            }
                            setSearchParams(newParams);
                          }}
                          className="pl-11 bg-secondary border-border text-sm"
                        />
                      </div>
                    </div>
                    <span className="text-muted-foreground mt-5">-</span>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Máximo</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">R$/m²</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Sem limite"
                          value={precoM2MaxUrl ? Number(precoM2MaxUrl).toLocaleString('pt-BR') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            const newParams = new URLSearchParams(searchParams);
                            if (value) {
                              newParams.set('precoM2Max', value);
                            } else {
                              newParams.delete('precoM2Max');
                            }
                            setSearchParams(newParams);
                          }}
                          className="pl-11 bg-secondary border-border text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apply Filters */}
                <Button
                  variant="gold"
                  className="w-full"
                  onClick={() => setShowFilters(false)}
                >
                  Aplicar Filtros
                </Button>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                >
                  Limpar Filtros
                </Button>
              </div>
            </aside>

            {/* Property Grid or Map */}
            <div className="flex-1">
              {/* Mobile View Mode Toggle */}
              <div className="flex sm:hidden items-center justify-center mb-6">
                <div className="flex items-center bg-secondary rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'list'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'map'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MapIcon className="h-4 w-4" />
                    Mapa
                  </button>
                </div>
              </div>

              {viewMode === 'map' ? (
                // Map View
                <PropertyMap 
                  properties={filteredMapProperties} 
                  isLoading={isLoadingMap} 
                />
              ) : (
                // List View
                <>
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
                            <PropertyCard property={property} mediaPrecoM2Bairro={property.bairro ? mediasPrecoM2PorBairro.get(property.bairro) : undefined} />
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
