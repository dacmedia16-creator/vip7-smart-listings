# Conectar ao fluxo `App_*` do Imoview

Objetivo desta etapa: **apenas estabelecer a conexão autenticada** via `/Usuario/App_ValidarAcesso` e validar que conseguimos chamar endpoints `App_*`. Nada de importação de clientes ainda — isso fica para a próxima etapa, depois que confirmarmos que o login funciona.

## O que vai ser feito

### 1. Cadastrar credenciais como secrets
Vou pedir dois secrets novos:
- `IMOVIEW_USER_EMAIL` — email do usuário Imoview que será usado como "service account"
- `IMOVIEW_USER_PASSWORD` — senha desse usuário

(A `IMOVIEW_API_KEY` que já temos continua sendo usada como header `chave` em **todas** as chamadas.)

### 2. Helper compartilhado de autenticação
Criar `supabase/functions/_shared/imoview-auth.ts` com:
- Função `getCodigoAcesso()` que:
  - Chama `POST https://api.imoview.com.br/Usuario/App_ValidarAcesso` com header `chave` + body `{ email, senha }`
  - Extrai o `codigoacesso` retornado
  - **Cacheia em memória** dentro da função (com TTL, ex.: 50 min) para não fazer login a cada request
  - Retorna o `codigoacesso` pronto para uso

- Função `imoviewAppFetch(path, options)` que monta a chamada com os dois headers obrigatórios:
  - `chave: <IMOVIEW_API_KEY>`
  - `codigoacesso: <resultado do login>`

### 3. Edge function de teste: `imoview-auth-test`
Pequena função que:
- Tenta autenticar via `getCodigoAcesso()`
- Faz uma chamada de smoke test em um endpoint `App_*` leve (ex.: `App_RetornarPessoas` com `pagina=1, registrosPorPagina=1`) só para confirmar que o `codigoacesso` é aceito
- Retorna `{ ok: true, sample: {...} }` ou o erro detalhado

### 4. Botão "Testar conexão Imoview (App)" no CRM
Em `/crm/configuracoes`, adicionar um pequeno card com:
- Botão **Testar conexão**
- Resultado (✅ autenticado / ❌ erro + mensagem)
- Texto indicando que as credenciais ficam guardadas como secrets

## Validação

1. Cadastrar os 2 secrets
2. Clicar em "Testar conexão" no CRM
3. Esperar: ✅ verde com 1 registro de exemplo retornado
4. Conferir nos logs da edge function que o `codigoacesso` foi obtido e reutilizado em chamadas subsequentes (sem refazer login)

## O que NÃO entra nesta etapa

- Importação em massa de clientes
- Vinculação de proprietários aos imóveis
- Sincronização agendada
- Mudanças em `clientes` / `cliente_imoveis`

Esses passos viram um plano separado depois que a conexão estiver confirmada funcionando.

## Detalhes técnicos

- Arquivos novos: `supabase/functions/_shared/imoview-auth.ts`, `supabase/functions/imoview-auth-test/index.ts`
- Arquivo editado: `src/crm/pages/Configuracoes.tsx` (apenas adiciona o card de teste)
- Cache do `codigoacesso` é por-instância da edge function (memória do worker), com expiração ~50min e refresh automático em 401
