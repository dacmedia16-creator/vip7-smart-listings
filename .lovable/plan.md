## Diagnóstico

Im móveis que a sync de "Desativados" marca como `ativo=false, status='inativo'` ficam invisíveis hoje porque:

1. **Site público** (`src/services/imoveisDb.ts` + RLS `imoveis_public_read`) — exige `ativo=true` AND `status IN ('disponivel','sob_proposta')`. **Correto, não muda.**
2. **CRM → /crm/imoveis** (`src/crm/pages/Imoveis.tsx`) — não filtra `ativo`, mas o filtro **Situação tem default `disponivel`**, então inativos só aparecem se o usuário trocar manualmente para "Inativo" (e ninguém percebe).
3. **Busca global do CRM** (`src/crm/components/GlobalSearch.tsx:145`) — tem `eq('ativo', true)` hardcoded, então código de imóvel inativo nunca aparece no Cmd+K.
4. **Diálogo "Adicionar imóvel de interesse"** — também filtra `ativo=true`. **Correto, fica como está** (não faz sentido vincular cliente a imóvel desativado).

## Mudanças

### 1. `src/crm/pages/Imoveis.tsx`
- Adicionar campo `ativo: 'ativos' | 'inativos' | 'todos'` ao tipo `Filters` e ao `EMPTY` com default `'ativos'`.
- Aplicar na query: `'ativos'` → `.eq('ativo', true)`; `'inativos'` → `.eq('ativo', false)`; `'todos'` → sem filtro.
- Novo `<Select>` "Visibilidade" na seção Identificação ao lado de Situação, com as três opções.
- Quando usuário escolher `'inativos'` ou `'todos'`, mudar o default de Situação de `'disponivel'` para `'todos'` automaticamente (caso contrário fica vazio).
- Mostrar badge cinza "Inativo" no card/linha quando `ativo=false` (não bloqueia clique).

### 2. `src/crm/components/GlobalSearch.tsx`
- Remover o `.eq('ativo', true)` da query de imóveis (linha 145). Em vez disso, ordenar inativos por último (`order('ativo', { ascending: false })`) e mostrar sufixo "(inativo)" no resultado quando aplicável. Assim quem digita o código encontra mesmo se foi desativado.

### 3. Nada mais
- `imoveisDb.ts`, RLS pública, página pública e `AddImovelInteresseDialog` permanecem intocados — inativos não vazam para o site.

## Fora de escopo
- Edge functions de sync.
- Schema do banco / RLS.
- Site público.

## Validação
1. Em `/crm/imoveis` com Visibilidade=Apenas ativos (default) → contagem igual à de hoje.
2. Trocar para "Apenas inativos" → aparecem os ~6 imóveis que a sync `desativados` acabou de marcar.
3. Cmd+K digitando o código de um imóvel inativo → aparece com sufixo "(inativo)".
4. Diálogo de "Adicionar imóvel de interesse" no cliente → continua mostrando só ativos.
