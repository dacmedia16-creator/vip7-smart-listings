## Melhorias no cadastro de imóveis (`/crm/imoveis/novo` e edição)

Três frentes, todas no arquivo `src/crm/pages/ImovelForm.tsx` (sem mudanças de schema/banco):

### 1. Navegação Próximo / Anterior entre abas
- Adicionar rodapé sticky dentro de cada aba com:
  - `← Anterior` (oculto na 1ª aba "Endereço")
  - Indicador `Etapa 2 de 5 · Detalhes`
  - `Próximo →` (nas abas 1-4) **ou** `Salvar imóvel` (na 5ª aba "Fotos")
- Botão `Salvar` global do rodapé continua existindo para quem quiser salvar a qualquer momento, mas o fluxo principal passa a ser sequencial.
- Ao clicar Próximo, rola a página para o topo do formulário.
- Bullets ✓ / • aparecem em cada `TabsTrigger` indicando se a aba já tem dados (heurística simples: algum campo da aba preenchido).

### 2. Auto-save em rascunho
- Hook de auto-save com **debounce de 2s** após qualquer mudança no form ou nas listas (fotos, características, proprietários pendentes).
- Comportamento:
  - **Editando imóvel existente** (`id` na URL): faz `UPDATE` direto na tabela `imoveis_proprios` com os campos atuais. Funciona em background, sem `toast`.
  - **Novo imóvel sem mínimos** (faltam `titulo`, `tipo`, `finalidade` ou `preco>0`): salva snapshot em `localStorage` na chave `imovel-rascunho:{user_id}`. Ao abrir `/crm/imoveis/novo` de novo, oferece "Restaurar rascunho?" via toast com ação.
  - **Novo imóvel com mínimos atingidos**: faz `INSERT` automático com `status='inativo'` + `ativo=false` para não vazar no site público, captura o `id` retornado e redireciona a URL para `/crm/imoveis/:id` via `navigate(..., { replace: true })`. Daí em diante cai no caso "editando".
- Indicador discreto ao lado do título: `Salvo às 14:32` / `Salvando…` / `Alterações não salvas`.
- Aviso `beforeunload` quando há alterações pendentes não salvas.
- Ao clicar `Salvar` manual na última aba (ou no botão global), promove o rascunho: define `status='disponivel'` e `ativo=true` (a menos que o usuário tenha mudado manualmente), limpa o `localStorage` e redireciona para `/crm/imoveis`.

### 3. Versão mobile
- `TabsList` deixa de ser `grid grid-cols-5` em telas pequenas — vira **scroll horizontal** com snap, abas com largura automática e ícone + label curto. Mantém o grid de 5 colunas em `md:` para cima.
- Rodapé de navegação Próximo/Anterior fica **sticky no bottom** em mobile (`fixed bottom-0` com safe-area), botões em largura total divididos 50/50, com `Salvar` virando ação principal só na última aba.
- Campos do grid interno mudam para `grid-cols-1` em mobile (atualmente alguns já são `md:grid-cols-3`, mas há lugares com `grid-cols-2` fixo — ajustar para `grid-cols-1 md:grid-cols-2/3`).
- Botão "Voltar" e título compactos em mobile.

### Detalhes técnicos
- Novo array constante `TABS = ['endereco','detalhes','relacionamentos','anotacoes','fotos']` para calcular índice atual, próximo e anterior.
- Função `goToTab(direction)` que faz `setTab(TABS[i ± 1])` e `window.scrollTo({top:0})`.
- `useEffect` de auto-save com `form.watch()` + `useDebouncedCallback` (implementação inline com `setTimeout`/`clearTimeout`, sem dependência nova).
- `useRef<'idle'|'saving'|'saved'|'dirty'>` para o status visual.
- Nenhuma mudança em RLS, edge functions, ou outras telas — escopo 100% frontend neste arquivo + um pequeno componente `FormStatusBadge` opcional.

### Fora de escopo
- Não mexo na lógica de upload de fotos, vínculo de proprietários, validação Zod ou permissões (RBAC).
- Não altero a tabela `imoveis_proprios`.
- Não toco no formulário de leads/clientes (só imóveis).
