# Sync Imoview — usar endpoint App como primário

## Problema
A conta Imoview atual retorna 404 no endpoint `RetornarDetalhesImovel`. Só funciona o `App_RetornarDetalhesImovel` (login via app, já configurado nos secrets `IMOVIEW_APP_EMAIL` / `IMOVIEW_APP_SENHA`). Hoje o sync chama o método clássico primeiro e ignora o 404 silenciosamente, então imóveis existentes não recebem refresh de detalhes (fotos, descrição, características).

## Mudanças
Arquivo único: `supabase/functions/imoview-sync/index.ts`

1. Criar helper `getDetalhes(codigo)` que chama `fetchDetailsApp` primeiro e cai para `fetchDetails` apenas se o App falhar.
2. Substituir todas as chamadas diretas a `fetchDetails` pelo helper:
   - caminho principal de update em lote (~linha 460)
   - caminho de novos imóveis (~linha 511)
   - caminho de detalhe individual (~linha 718)
3. Logar apenas quando ambos os métodos falharem (elimina ruído de 404 esperado).
4. Registrar em `imoview_sync_log` a contagem de detalhes atualizados via App vs fallback.

Sem mudança de schema, RLS ou outras telas.

## Validação
- Rodar sync manual em `/crm/configuracoes/imoview`
- Conferir `imoview_sync_log`: detalhes atualizados > 0
- Edge function logs sem 404 em massa
- Um imóvel existente com `updated_at` recente e fotos/descrição refrescados