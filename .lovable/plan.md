

## Adicionar filtros diretos na API Imoview para avaliacao-ia

### Descoberta

A API Imoview `RetornarImoveisDisponiveis` aceita estes filtros (todos lowercase, exceto paginacao que e camelCase):

- `finalidade` - ja usado
- `codigocidade` - ja usado
- `codigosbairros` - **NAO usado** (podemos resolver o codigo do bairro como fazemos com a cidade)
- `numeroquartos` - **NAO usado** (podemos enviar direto)
- `numerovagas` - **NAO usado** (podemos enviar direto)
- `codigotipo` - **NAO usado** (podemos mapear o tipo do imovel para codigo)
- `valorde` / `valorate` - filtros de valor (nao aplicavel aqui)

### Problema atual

A funcao `avaliacao-ia` busca ate 300 imoveis da API usando apenas filtros de finalidade e cidade, e depois filtra no pos-processamento. Isso e ineficiente -- busca muitos imoveis irrelevantes.

### Solucao

Enviar filtros adicionais diretamente no payload da API Imoview para receber resultados mais relevantes desde o inicio. Isso reduz o volume de dados e melhora a qualidade dos comparaveis.

### Arquivo: `supabase/functions/avaliacao-ia/index.ts`

**1. Resolver codigo do bairro** (similar ao que ja fazemos com cidade)
- Apos resolver `codigoCidade`, chamar `RetornarBairrosDisponiveis` com o codigo da cidade
- Buscar o bairro pelo nome e obter seu codigo
- Enviar `codigosbairros` no payload de busca

**2. Enviar `numeroquartos` direto na API**
- Se o usuario informou quartos, enviar no payload (sem tolerancia -- a tolerancia continua no pos-processamento)

**3. Enviar `numerovagas` direto na API**
- Se o usuario informou vagas, enviar no payload

**4. Resolver e enviar `codigotipo`**
- Chamar `RetornarTiposImoveisDisponiveis` para obter os codigos de tipo
- Mapear o tipo informado pelo usuario para o codigo correto
- Enviar `codigotipo` no payload

### Detalhes Tecnicos

```text
Novos filtros no searchPayload:
- codigosbairros: resolver via RetornarBairrosDisponiveis (POST com codigocidade)
- numeroquartos: enviar direto se informado pelo usuario  
- numerovagas: enviar direto se informado pelo usuario
- codigotipo: resolver via RetornarTiposImoveisDisponiveis (GET)

IMPORTANTE: Todos os parametros de filtro devem ser lowercase (exceto numeroPagina/numeroRegistros)

Fallback: se a busca com filtros diretos retornar poucos resultados (< 5),
repetir sem numeroquartos/numerovagas para ampliar comparaveis
```

### Fluxo atualizado

1. Resolver codigoCidade (ja existente)
2. Resolver codigoBairro (NOVO)
3. Resolver codigoTipo (NOVO)
4. Buscar imoveis com todos os filtros na API
5. Se poucos resultados, refazer busca sem quartos/vagas
6. Aplicar filtros de pos-processamento (area, tolerancias) -- ja existente
7. Enviar para IA -- ja existente

