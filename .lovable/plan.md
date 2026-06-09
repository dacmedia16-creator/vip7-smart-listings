## Objetivo
Mover a Descrição (e Meta description) para serem os últimos campos do formulário, e adicionar um botão "Gerar descrição com IA" que usa todos os outros campos já preenchidos para gerar uma descrição imobiliária profissional.

## Mudanças

### 1. Reorganizar abas — `src/crm/pages/ImovelForm.tsx`
Na aba `detalhes`, mover "Anúncio & SEO" (`textos`) para o **fim**, depois de Lazer:
- Nova ordem dos TabsTrigger: Identificação → Valores → Situação → Áreas → Cartório → Internas → Externas → Lazer → **Anúncio & SEO**.
- Mover o `<TabsContent value="textos">` correspondente para depois do bloco `lazer`.
- Dentro da aba `textos`, manter `ponto_referencia`, `melhor_acesso`, `titulo_anuncio`, `construtora`, `ano_construcao`, `venc_autorizacao_venda` no topo; logo abaixo o botão **"✨ Gerar descrição com IA"** e depois os textareas Descrição e Meta description (Meta description também ganha botão próprio "Gerar meta description").

### 2. Edge function nova — `supabase/functions/gerar-descricao-imovel/index.ts`
- Recebe `POST { imovel: {...campos do form} }`.
- Chama Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`, modelo `google/gemini-2.5-flash`) com prompt em PT-BR pedindo:
  - `descricao`: texto comercial persuasivo de 4–8 parágrafos descrevendo o imóvel com base nos campos (tipo, finalidade, bairro, cidade, áreas, dormitórios, suítes, vagas, características internas/externas/lazer, condomínio, ponto de referência, etc.).
  - `meta_description`: até 155 caracteres para SEO.
- Retorna `{ descricao, meta_description }` em JSON.
- CORS aberto, sem JWT (rota pública por trás do form autenticado do CRM).
- Registrada em `supabase/config.toml` com `verify_jwt = false`.

### 3. Front: handler de geração
- No `ImovelForm.tsx`, adicionar estado `aiLoading` e função `gerarDescricaoIA()` que:
  - Coleta `form.getValues()` filtrando campos vazios.
  - Chama `supabase.functions.invoke('gerar-descricao-imovel', { body: { imovel } })`.
  - Em sucesso, faz `form.setValue('descricao', ...)` e `form.setValue('meta_description', ...)` com `shouldDirty: true`. Sempre sobrescreve (com toast de confirmação se já houver texto? — simples: sobrescreve direto e mostra toast "Descrição gerada").
  - Erros via `toast` destrutivo.

## Detalhes técnicos
- Modelo: `google/gemini-2.5-flash` (rápido e barato; sem cobrança de API key — usa `LOVABLE_API_KEY` do ambiente).
- Prompt instrui a NÃO inventar dados não fornecidos, usar tom profissional brasileiro de mercado imobiliário, sem emojis, sem preço (preço fica no anúncio dinamicamente).
- Resposta JSON via `response_format: { type: 'json_object' }`.
