## Problema

Na página `/crm/leads`, o card de filtros e a tabela estão renderizando com **fundo preto** e **texto preto** (nomes dos leads invisíveis, labels "Nome / Telefone / Interesse..." quase ilegíveis). O resto do CRM usa tema claro creme (`#FAF8F3` + bordas `#E8E4D9` + texto `#0F0F12`), então essa página ficou destoante e ilegível.

A causa é que o `Card` e o `Table` do shadcn estão pegando os tokens padrão `bg-card` / `bg-background` do tema escuro global, sem as classes de cor explícitas que as outras páginas do CRM aplicam.

## Correção (apenas visual, sem mudar lógica)

Editar **`src/crm/pages/Leads.tsx`** para forçar o esquema claro do CRM, igual às páginas Clientes / Imóveis / Funil:

1. **Card de filtros**: adicionar `bg-white` ao `<Card>` e garantir que o `<CardContent>` tenha texto escuro. Inputs e selects já são claros — só o container está preto.
2. **Card da tabela**: adicionar `bg-white` ao `<Card>` que envolve a `<Table>`.
3. **Cabeçalho da tabela**: aplicar `bg-[#FAF8F3]` no `<TableHeader>` e `text-[#4A4A52]` nos `<TableHead>` para o creme suave usado nas outras listagens.
4. **Linhas**: garantir `hover:bg-[#FAF8F3]` e remover qualquer herança escura — as células já têm cores explícitas, mas o `<TableRow>` precisa de `border-[#E8E4D9]`.
5. **Nome do lead**: já está `text-[#0F0F12]`, vai voltar a aparecer assim que o fundo virar branco.

Nenhuma alteração em:
- Lógica de busca / filtros / paginação
- Estrutura de colunas
- Componentes compartilhados (`Card`, `Table`) — fix é local na página, não mexe no design system global, para não afetar outras telas.

## Arquivo

- **Editado**: `src/crm/pages/Leads.tsx` (apenas classes Tailwind nos wrappers `Card`, `TableHeader`, `TableHead`, `TableRow`).

## Validação

Abrir `/crm/leads` e conferir:
- Card de filtros com fundo branco, texto escuro legível.
- Tabela com cabeçalho creme, linhas brancas, nomes dos leads visíveis em preto.
- Visual idêntico ao da página `/crm/clientes`.
