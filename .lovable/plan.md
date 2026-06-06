## Busca global (Cmd+K / Ctrl+K)

Paleta de comandos disparada por atalho global em qualquer página do `/crm`, com busca em tempo real (debounce 200ms) em **leads**, **imóveis próprios** e **navegação rápida**.

### UX

- Atalho: **Cmd+K** (Mac) / **Ctrl+K** (Win), além de ícone de busca na top bar do `CrmLayout`.
- Dialog usando o componente `Command` já instalado (`src/components/ui/command.tsx` – cmdk).
- Campo de busca no topo, com placeholder "Buscar leads, imóveis ou ações…".
- **Filtros rápidos** em chips clicáveis no topo do dialog: `Tudo` · `Leads` · `Imóveis` · `Ações`. Clicar restringe o escopo da busca.
- Resultados agrupados em seções (`CommandGroup`):
  - **Leads** — nome em destaque, badge do status do funil, telefone e cidade em segunda linha.
  - **Imóveis** — título, badge de status, código interno, cidade/bairro e preço formatado.
  - **Ações rápidas** — atalhos fixos: "Novo lead", "Novo imóvel", "Nova tarefa", "Dashboard", "Funil", "Relatórios", "Configurações".
- Navegação 100% via teclado (setas + Enter já é nativo do cmdk). `Esc` fecha. Click em resultado também navega.
- Estado vazio amigável: "Digite para buscar…" / "Nenhum resultado para 'xxx'".
- Texto que casou com a busca recebe **highlight** sutil (mark com `bg-primary/20`).

### Comportamento de busca

- Query mínima de 2 caracteres para disparar fetch (ações rápidas aparecem mesmo com query vazia).
- Debounce de 200ms para evitar excesso de requests enquanto o usuário digita.
- Fetch paralelo em leads + imóveis quando filtro = `Tudo`; senão, só a tabela relevante.
- Limite de **8 resultados por seção** com nota "Ver todos os resultados →" que leva para a página de listagem com query pré-preenchida (`/crm/leads?q=…` e `/crm/imoveis?q=…`).
- Cancelamento de requisições antigas via `AbortController` para evitar race conditions.
- Respeita RLS: usa o cliente Supabase autenticado já existente, então corretor vê só seus leads etc.

### Campos pesquisados

- **Leads** (`public.leads`): `nome`, `email`, `telefone`, `cidade_interesse`, `bairro_interesse`, `imovel_interesse_codigo`, `observacoes`. Filtro: `ilike` em OR + `created_at DESC`.
- **Imóveis** (`public.imoveis_proprios`): `titulo`, `codigo_interno`, `cidade`, `bairro`, `endereco`, `descricao`. Filtro: `ilike` em OR + `created_at DESC`. Não filtrar por `ativo` (corretor pode buscar inativo também).

### Histórico recente

- Últimas 5 buscas salvas em `localStorage` (`crm:recent-searches`) e exibidas como chips quando o input está vazio. Clicar repete a busca.

### Arquivos a criar / editar

**Novos:**
- `src/crm/components/GlobalSearch.tsx` — Dialog `cmdk`, lógica de busca, filtros, highlight, recents.
- `src/crm/hooks/useGlobalSearch.tsx` — Context com `open / setOpen / toggle` para que qualquer componente possa abrir o dialog.

**Editar:**
- `src/crm/components/CrmLayout.tsx` — Envolver children com `GlobalSearchProvider`, renderizar `<GlobalSearch />` uma vez no layout, adicionar botão de busca na top bar ("Buscar… ⌘K") que chama `toggle()`. Listener global `keydown` para `Cmd/Ctrl+K` (com `e.preventDefault()`).
- `src/crm/pages/Leads.tsx` — Ler `?q=` da URL e pré-popular o filtro de busca existente.
- `src/crm/pages/Imoveis.tsx` — Mesmo tratamento de `?q=`.

### Detalhes técnicos

- Atalho registrado em `useEffect` no `CrmLayout`, ignorando quando foco está em `input`/`textarea` que NÃO seja o próprio do dialog (`cmdk` cuida do foco interno).
- Componentes shadcn usados: `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `Badge`.
- Formatação de preço reusa helper já existente (se houver) ou `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Sem mudanças de banco — RLS atual já cobre o caso de uso.

### Fora de escopo (Fase 3 restante)

- Relatórios com filtros + export PDF.
- Calendário visual.

Esses dois entram depois, em entregas separadas.