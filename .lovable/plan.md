# Sincronizar imóveis desativados do Imoview (via API)

Hoje a sync (`supabase/functions/imoview-sync`) busca **Venda + Aluguel** ativos (`/Imovel/RetornarImoveis` com fallback para `RetornarImoveisDisponiveis`) e por isso os desativados nunca entram. Vou adicionar um modo dedicado.

## 1. Edge function `imoview-sync` — novo modo `desativados`

- Adiciona ao body: `mode: 'desativados'`.
- Tenta nessa ordem (primeiro que responder OK ganha):
  1. `POST /Imovel/RetornarImoveisInativos` com `{ finalidade, numeropagina, numeroregistros }` (endpoint que o Imoview expõe na maioria das contas).
  2. `POST /Imovel/RetornarImoveis` com `{ finalidade, situacao: 'Inativo', numeropagina, numeroregistros }`.
  3. Fallback final: `POST /Imovel/RetornarImoveis` paginando tudo e filtrando no servidor pelo `situacao/statusimovel` (custa mais quota, usado só se 1 e 2 falharem na pág 1).
- Cursor e paginação (FINALIDADES = [2,1], PAGE_SIZE = 20, PAGES_PER_CHUNK = 4) reaproveitam a mesma lógica/auto-reinvoke do modo `full`.
- `mapToRow` continua o mesmo — `mapStatus()` já mapeia "inativ/suspens/bloque/desativ/indispon" → `inativo`. Só ajuste: nesse modo, força `ativo: false` no payload (em vez de `ativo: true`) para os desativados sumirem do site público mesmo se a API devolver outro status.
- `imoview_sync_log.mode` grava `'desativados'` para aparecer no histórico.

## 2. UI em `SincronizacaoImoview.tsx`

Novo card "Imóveis desativados" no topo da página, com 2 botões:

- **Sincronização completa de desativados** → `trigger('desativados')`. Confirma com alerta.
- **Re-sincronizar 1 código como desativado** (input + botão) → chama `mode: 'single'` que já existe, e a função detecta status `inativo` automaticamente pela API.

Mostra contadores do log em andamento igual aos outros modos.

## 3. Sem mudanças no schema

`imoveis_proprios` já tem `status='inativo'`, `ativo bool`, `codigo_imoview unique`. RLS público (`imoveis_public_read`) já bloqueia tudo que não seja `disponivel/sob_proposta`, então desativados não vazam.

## Arquivos editados

- `supabase/functions/imoview-sync/index.ts` — novo branch `desativados` em `fetchListing` + handler.
- `src/crm/pages/SincronizacaoImoview.tsx` — novo card + tipo `mode` aceita `'desativados'`.

## Pontos abertos

Se nenhum dos 3 endpoints/filtros funcionar na sua conta Imoview (a API varia por contrato), o log da função vai mostrar a resposta exata e a gente troca pela planilha de exportação (importador que já existe em `/crm/imoveis/importar-desativados`). Vou logar bem detalhado no primeiro disparo.
