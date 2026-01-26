

## Plano: Otimizar Carregamento de Imoveis

### Diagnostico dos Gargalos

Analisando o codigo, identifiquei os principais pontos de lentidao:

1. **listarImoveisRecentes (Edge Function)**: Pagina por TODAS as paginas (ate 100 paginas x 50 imoveis = 5000) SEQUENCIALMENTE para contar corretamente a quantidade. Isso causa delay significativo na home page.

2. **useImoveisMap (Frontend)**: Quando ativa a visualizacao de mapa, busca TODOS os imoveis em lotes paralelos de 10 paginas. Para 800+ imoveis = 40+ requests.

3. **Sem cache de imoveis**: Diferente dos condominios (que tem `condominios_cache`), os imoveis sao sempre buscados da API externa.

### Solucoes Propostas (por ordem de impacto)

| Prioridade | Solucao | Impacto Estimado |
|------------|---------|------------------|
| 1 | Cache de imoveis no banco de dados | 80% mais rapido |
| 2 | Paginacao paralela no servidor | 50% mais rapido |
| 3 | Lazy loading do mapa | UX imediata |
| 4 | Pre-fetch em background | Carregamento invisivel |

### Implementacao Recomendada: Cache de Imoveis

**Fase 1: Criar tabela de cache**

```sql
CREATE TABLE public.imoveis_cache (
  codigo INTEGER PRIMARY KEY,
  dados JSONB NOT NULL,
  finalidade INTEGER NOT NULL,
  cidade TEXT,
  cidade_codigo INTEGER,
  bairro TEXT,
  bairro_codigo INTEGER,
  condominio_codigo INTEGER,
  valor DECIMAL(15,2),
  tipo TEXT,
  tipo_codigo INTEGER,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  data_atualizacao TIMESTAMP WITH TIME ZONE,
  cache_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para buscas rapidas
CREATE INDEX idx_imoveis_cache_finalidade ON imoveis_cache(finalidade);
CREATE INDEX idx_imoveis_cache_cidade ON imoveis_cache(cidade_codigo);
CREATE INDEX idx_imoveis_cache_bairro ON imoveis_cache(bairro_codigo);
CREATE INDEX idx_imoveis_cache_valor ON imoveis_cache(valor);
CREATE INDEX idx_imoveis_cache_updated ON imoveis_cache(cache_updated_at);
```

**Fase 2: Edge Function para sincronizacao**

Criar funcao `sync-imoveis` que:
- Roda periodicamente (cron) ou sob demanda
- Busca imoveis alterados desde ultima sincronizacao
- Atualiza tabela de cache

**Fase 3: Alterar listarImoveis para usar cache**

```typescript
// Na edge function, buscar do cache primeiro
const { data: cachedImoveis } = await supabase
  .from('imoveis_cache')
  .select('dados')
  .eq('finalidade', finalidade)
  .gte('valor', valorMin)
  .lte('valor', valorMax)
  .order('data_atualizacao', { ascending: false })
  .range(offset, offset + limite - 1);
```

### Alternativa Mais Simples: Paralelizar no Servidor

Se o cache completo for muito trabalho, podemos otimizar o endpoint atual:

**Alteracoes no `listarImoveisRecentes`:**

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/imoview-api/index.ts` | 1. Buscar paginas em PARALELO (Promise.all) ao inves de sequencial |
| `supabase/functions/imoview-api/index.ts` | 2. Limitar a 20 paginas max (1000 imoveis recentes) |
| `supabase/functions/imoview-api/index.ts` | 3. Adicionar cache em memoria para quantidade total |

**Codigo otimizado:**

```typescript
case 'listarImoveisRecentes': {
  const PAGE_SIZE = 50;
  const MAX_PAGES = 20; // Reduzido de 100
  const BATCH_SIZE = 5; // Paralelo
  
  // Primeira pagina para estimar total
  const firstPage = await fetchPage(1);
  const estimatedTotal = firstPage.quantidade || 1000;
  const totalPages = Math.min(Math.ceil(estimatedTotal / PAGE_SIZE), MAX_PAGES);
  
  // Buscar restante em PARALELO
  const allImoveis = [...firstPage.lista];
  const remainingPages = Array.from({length: totalPages - 1}, (_, i) => i + 2);
  
  for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(p => fetchPage(p)));
    results.forEach(r => allImoveis.push(...r.lista));
  }
  
  // Filtrar e paginar...
}
```

**Alteracoes no `useImoveisMap`:**

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useImoveisMap.ts` | 1. Aumentar BATCH_SIZE de 10 para 15 |
| `src/hooks/useImoveisMap.ts` | 2. Usar cache mais agressivo (30 minutos) |
| `src/components/PropertyMap.tsx` | 3. Mostrar esqueleto enquanto carrega |

### Melhoria de UX Imediata

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Imoveis.tsx` | 1. Mostrar contagem aproximada enquanto carrega exata |
| `src/pages/Imoveis.tsx` | 2. Carregar mapa sob demanda (lazy) |
| `src/components/PropertyMap.tsx` | 3. Mostrar progresso de carregamento |

### Resultado Esperado

- **Antes**: 10-30 segundos para carregar todos os imoveis
- **Depois (com cache)**: menos de 1 segundo
- **Depois (sem cache, paralelo)**: 3-5 segundos

### Recomendacao

Comecar com a **paralelizacao no servidor** (impacto rapido, menor risco) e depois implementar o **cache completo** como fase 2.

