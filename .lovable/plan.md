# Busca por IA no Hero da Home

Adicionar um chat com IA no topo da home onde o visitante descreve em linguagem natural o imóvel que procura (ex.: "apartamento 3 quartos no Campolim até 800 mil com piscina") e a IA conversa, refina filtros e mostra cards reais de imóveis do nosso banco.

## Onde

- Substituir / integrar ao componente atual `HeroSection` da home (`src/components/HeroSection.tsx`).
- A barra de busca tradicional permanece como fallback abaixo do chat (ou via aba "Busca avançada").

## Como funciona (UX)

1. Visitante vê uma caixa estilo chat com placeholder ex.: "Descreva o imóvel dos seus sonhos…" e sugestões rápidas (chips): "Apto 3 quartos Sorocaba", "Casa com piscina até 1M", "Aluguel Campolim".
2. Ao enviar, a IA:
   - Responde em texto curto confirmando o que entendeu.
   - Chama a tool `buscar_imoveis` (mesma lógica de `supabase/functions/_shared/ia.ts`) contra `imoveis_proprios`.
   - Renderiza os cards de imóveis encontrados dentro da própria conversa (componente `PropertyCard` reaproveitado, versão compacta).
3. Visitante pode mandar nova mensagem refinando ("só com 2 vagas", "mais barato", "outro bairro") e a IA mantém o contexto.
4. Cada card abre `/imovel/:codigo` em nova aba (mantém regra do projeto).
5. Sem captura de lead — busca 100% aberta. Sem persistência (conversa zera ao recarregar).

## Backend

Nova edge function `supabase/functions/busca-ia-site/index.ts`:

- Pública (sem JWT), CORS aberto.
- Recebe `{ messages: UIMessage[] }` (AI SDK).
- Usa Lovable AI Gateway (`google/gemini-3-flash-preview`) via `LOVABLE_API_KEY` (já existe).
- Reaproveita helpers de `supabase/functions/_shared/ia.ts`:
  - `buscarImoveis` (já filtra `ativo=true`, status disponível/sob_proposta, limita 5).
  - Tool `buscar_imoveis` com parâmetros: cidade, bairro, tipo, finalidade, preco_min, preco_max, quartos.
- Adiciona tool nova `detalhes_imovel_publico` retornando ficha pública resumida + link `vipsevenimoveis.com.br/imovel/<codigo>`.
- System prompt em PT-BR: corretor consultivo da VIP Seven, só sugere imóveis reais retornados pela tool, nunca inventa, formata preços em R$, no máximo 5 sugestões por turno, faz 1-2 perguntas se faltar info essencial.
- Streaming via `toUIMessageStreamResponse` para resposta em tempo real.
- `stopWhen: stepCountIs(5)` para o loop de tool calling.
- Retorna `tool-result` com a lista de imóveis no `parts` da mensagem (front renderiza cards a partir disso).

`supabase/config.toml`: adicionar bloco para `busca-ia-site` com `verify_jwt = false`.

## Frontend

Instalar AI Elements + AI SDK:
- `bun add ai @ai-sdk/react`
- `bunx ai-elements@latest add conversation message prompt-input shimmer tool`

Novo componente `src/components/HeroAiSearch.tsx`:
- `useChat` apontando para `${VITE_SUPABASE_URL}/functions/v1/busca-ia-site` com header `Authorization: Bearer <publishable key>`.
- Renderiza `Conversation` + `Message` + `PromptInput` (AI Elements).
- Sobre fundo do hero atual (mantém o tema escuro/dourado luxuoso da memória).
- Quando `message.parts` contém `tool-result` de `buscar_imoveis`, renderiza grid horizontal scrollável de `PropertyCardCompact` (novo, baseado em `PropertyCard`).
- Estado inicial: heading curto + 3-4 chips de sugestão clicáveis que disparam `sendMessage`.
- Sem histórico persistido; botão "Nova busca" limpa.

Integrar em `src/components/HeroSection.tsx`: chat substitui o bloco central; mantém background e CTA secundário.

## Validação

1. `bunx tsgo` limpo.
2. `curl` na edge function com mensagem "apto 3 quartos Sorocaba até 700 mil" → deve retornar stream com tool call e imóveis reais do banco.
3. Abrir preview → digitar busca natural → ver cards renderizados → clicar em um → abre `/imovel/:codigo` em nova aba.
4. Refinar com 2ª mensagem ("só com piscina") → IA mantém contexto e filtra.

## Detalhes técnicos

- Modelo: `google/gemini-3-flash-preview` (default).
- Sem `add_secret` necessário — `LOVABLE_API_KEY` já existe.
- Tool schema usa nomes em PT que o Gemini entende bem (cidade, bairro, preco_min, etc.).
- `PropertyCardCompact` exibe foto, título, bairro/cidade, preço, quartos/área, sem favoritar/comparar (para caber no chat).
- Sem rate limit por IP nessa primeira versão (busca pública, sem write no banco além de logs opcionais).
- Sem alteração no fluxo de leads, sem alteração em `leadCapture.ts`, sem alteração nas tabelas existentes.
