# Importar imóveis desativados + proprietários, tudo na mesma tela

## Realidade da API (confirmado no swagger)

A API do Imoview **não expõe** um endpoint que liste imóveis desativados. Os únicos endpoints de listagem (`RetornarImoveisDisponiveis`, `RetornarImoveisAlterados`) só trazem imóveis ativos/disponíveis.

Por isso, a planilha exportada do painel Imoview continua sendo o **ponto de partida obrigatório** para descobrir quais códigos estão desativados.

**A boa notícia**: uma vez que temos o `codigo` do imóvel, o endpoint `App_RetornarDetalhesImovel` (que exige login com `codigoacesso`) retorna o objeto completo do imóvel **incluindo o array `proprietarios`** com nome, email, telefone e percentual. Isso funciona tanto para imóveis ativos quanto desativados.

## O que já existe

- **Tela** `/crm/imoveis/importar-desativados` — faz upload da planilha (.xls/.xlsx/.html), parseia, insere em `imoveis_proprios` com `status='inativo'`, `ativo=false`, `origem='imoview_desativado'`.
- **Edge function** `imoview-sync-proprietarios` — já chama `App_RetornarDetalhesImovel` para cada imóvel, extrai `proprietarios`, cria/atualiza `clientes` e cria vínculos em `cliente_imoveis` (papel='proprietario'). Aceita parâmetro `imovelIds` (lista de IDs).

## Problemas a corrigir

1. A função `imoview-sync-proprietarios` usa secrets antigos (`IMOVIEW_APP_EMAIL`, `IMOVIEW_APP_SENHA`) e **envia a senha em texto puro** — o login está quebrado, porque o Imoview exige senha em MD5 (acabamos de descobrir no card de teste).
2. A tela de importação termina sem oferecer o passo seguinte (buscar proprietários).

## O que vou fazer

### 1. Consertar `imoview-sync-proprietarios`
Trocar o bloco próprio de login pelo helper compartilhado `_shared/imoview-auth.ts` (que já faz MD5 + cache de 50min + refresh em 401). Manter toda a lógica de batch/cursor/persistência — só o login muda.

### 2. Encadear sync após import na tela
Em `ImportarImoveisDesativados.tsx`:
- Adicionar checkbox **"Buscar proprietários no Imoview após importar"** (marcado por padrão).
- Após o loop de inserção, se a checkbox estiver ligada e houver imóveis inseridos:
  - Pegar os UUIDs dos imóveis recém-inseridos (já temos `codigo_imoview` → query SELECT id WHERE codigo_imoview IN (...)).
  - Chamar `supabase.functions.invoke('imoview-sync-proprietarios', { body: { mode: 'full', imovelIds } })`.
  - Mostrar status "Buscando proprietários…" e fazer polling em `imoview_sync_log` (a função roda em background com `EdgeRuntime.waitUntil`) até `status` virar `ok`/`partial`.
  - Exibir o resultado final: X proprietários vinculados, Y imóveis sem proprietário no Imoview, Z erros.

### 3. UI de resultado expandida
O card final passa a mostrar duas seções:
- **Imóveis** — inseridos / ignorados (duplicados) / erros
- **Proprietários** — vinculados / imóveis sem proprietário / erros, com link para `/crm/clientes` para conferir

## O que NÃO entra

- Importação em massa de TODOS os clientes (separado, plano futuro).
- Reimportação/atualização de imóveis ativos (sync já existente cuida).
- Listar desativados via API (não existe).

## Detalhes técnicos

- Arquivos editados: `supabase/functions/imoview-sync-proprietarios/index.ts` (substituir login pelo helper compartilhado), `src/crm/pages/ImportarImoveisDesativados.tsx` (checkbox + chamada + polling + UI de resultado).
- Sem mudanças de schema.
- Sem novos secrets — usa `IMOVIEW_USER_EMAIL`/`IMOVIEW_USER_PASSWORD` que já cadastramos (e remove a dependência de `IMOVIEW_APP_EMAIL`/`IMOVIEW_APP_SENHA`, que podem ser deletados depois).
