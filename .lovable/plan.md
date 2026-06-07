# Atualizar senha do Imoview e rerodar sync de proprietários

## O que vai acontecer

1. Disparo o formulário seguro nativo da Lovable (`update_secret` para `IMOVIEW_APP_SENHA`). Esse formulário é renderizado pelo próprio sistema da Lovable, fora do código do projeto — a senha vai direto para o cofre de secrets do backend e nunca trafega pelo frontend nem fica no histórico do chat.

2. Após você salvar, executo novamente a edge function `imoview-sync-proprietarios` em modo `full` (todos os ~1000 imóveis com `codigo_imoview`).

3. Acompanho o progresso na tabela `imoview_sync_log` e nos logs da edge function para confirmar que o `App_ValidarAcesso` passou (sem mais erros 401 de "senha inválida").

4. Reporto o resultado: total processado, quantos proprietários inseridos em `clientes`, quantos vínculos criados em `cliente_imoveis`, e erros se houver.

## Observações

- Nada muda no código — apenas atualização de secret e re-execução.
- Se a senha nova também for rejeitada, mostro o erro do Imoview e investigamos (usuário bloqueado, email errado, etc).
- Se preferir trocar também o `IMOVIEW_APP_EMAIL` (usar outro usuário admin do Imoview), me avise antes para incluir os dois campos no formulário.
