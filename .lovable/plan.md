## Objetivo
Executar a primeira importação completa de clientes do Imoview agora que o secret `IMOVIEW_APP_SENHA` foi corrigido.

## Passos
1. Invocar a edge function `imoview-sync-clientes` com `{ mode: 'full' }` via `supabase--curl_edge_functions`.
2. Acompanhar `supabase--edge_function_logs` para confirmar:
   - Login OK em `/Usuario/App_ValidarAcesso` (sem erro de senha inválida).
   - Paginação de `App_RetornarPessoas` e `App_RetornarEmpresas`.
   - Reinvocações em chunks até concluir.
3. Consultar o banco:
   - `SELECT COUNT(*) FROM clientes;`
   - `SELECT COUNT(*) FROM cliente_imoveis;`
   - Último registro em `imoview_sync_log` (status, totais, erros).
4. Reportar números finais ao usuário.

## Critério de sucesso
- Log mostra login bem-sucedido.
- `clientes` populada com >0 registros.
- Última entrada de `imoview_sync_log` com status `success`.

## Fallback
Se o login ainda falhar (senha/2FA), parar e pedir novas credenciais ou avaliar import por CSV.