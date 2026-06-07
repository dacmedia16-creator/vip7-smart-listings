# Por que o lead não mostra o imóvel de interesse

Hoje o detalhe do lead (`src/crm/pages/LeadDetail.tsx`) não mostra nenhum link de imóvel porque:

1. **Na importação Imoview CSV** (`src/crm/pages/ImportarLeads.tsx`):
   - O campo `imovel_interesse_codigo` recebe a coluna `Codigo` — que é o código do **atendimento**, não do imóvel.
   - Os códigos reais dos imóveis que o lead viu (colunas `ImoveisCarrinho`, `ImoveisVisita`, `ImoveisProposta`) são jogados em `observacoes` como texto plano ("Imóveis carrinho: 346"). Por isso aparecem só como texto, sem link.

2. **A página `LeadDetail.tsx`** não tem bloco nenhum que busque/renderize os imóveis vinculados — nem a partir de `imovel_interesse_codigo`, nem do carrinho.

# Plano

## 1. Armazenar os códigos do carrinho de forma estruturada
- Adicionar 3 colunas `text[]` em `public.leads`:
  - `imoveis_carrinho_codigos`
  - `imoveis_visita_codigos`
  - `imoveis_proposta_codigos`
- Migration cria as colunas (nullable, default `'{}'`).

## 2. Atualizar a importação (`ImportarLeads.tsx`)
- Fazer parse de `ImoveisCarrinho` / `ImoveisVisita` / `ImoveisProposta` (split por `,` `;` `|` `/` espaço), salvando arrays de códigos nas novas colunas.
- Manter a linha textual em `observacoes` (compatibilidade) **ou** removê-la — vou manter por enquanto.
- `imovel_interesse_codigo` continua sendo o `Codigo` do atendimento (não mexer agora).

## 3. Mostrar no `LeadDetail.tsx`
- Novo card "Imóveis de interesse" abaixo do card principal, com 3 seções: Carrinho · Visitas · Propostas.
- Para cada lista: `SELECT id, codigo_imoview, titulo, cidade, bairro, preco, fotos[1]` de `imoveis_proprios` onde `codigo_imoview IN (...)`.
- Cada item: thumbnail + título + cidade/bairro + preço, clicável abrindo `/crm/imoveis/:id` em nova aba.
- Códigos sem imóvel correspondente no banco: mostrar como badge cinza "#346 (não cadastrado)".

## 4. Backfill (one-shot SQL na mesma migration)
- Para leads existentes, extrair os códigos da string `observacoes` via regex (`Imóveis carrinho: ([^|]+)`, idem visita/proposta) e popular as novas colunas — assim os leads já importados também passam a exibir os imóveis.

# Detalhes técnicos

- Arquivos editados: `src/crm/pages/LeadDetail.tsx`, `src/crm/pages/ImportarLeads.tsx`, nova migration SQL.
- Sem mudanças em RLS (colunas novas herdam policies de `leads`).
- Tipos Supabase regenerados automaticamente após a migration.
