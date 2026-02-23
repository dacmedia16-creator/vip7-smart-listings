

## Corrigir erro de CORS no CEP da pagina Avaliacao

### Problema

A chamada direta ao `https://viacep.com.br/ws/{cep}/json/` no navegador esta sendo bloqueada por politica de CORS. O ViaCEP nao retorna o header `Access-Control-Allow-Origin`, impedindo a consulta.

### Solucao

Criar uma funcao backend (edge function) como proxy para o ViaCEP, e atualizar o formulario para usar essa funcao em vez de chamar o ViaCEP diretamente.

### Alteracoes

**1. Nova edge function: `supabase/functions/cep-lookup/index.ts`**

- Recebe o CEP via query param ou corpo da requisicao
- Faz a chamada ao ViaCEP no servidor (sem CORS)
- Retorna os dados (logradouro, bairro, localidade) para o frontend
- Inclui headers CORS adequados na resposta

**2. Atualizar `src/pages/Avaliacao.tsx`**

- Na funcao `handleCepChange`, trocar a chamada direta ao ViaCEP:
  - De: `fetch('https://viacep.com.br/ws/${digits}/json/')`
  - Para: chamada via `supabase.functions.invoke('cep-lookup', { body: { cep: digits } })`
- Manter todo o resto da logica (mascara, preenchimento automatico de endereco/bairro/cidade, loading indicator)

### Detalhes Tecnicos

A edge function sera simples:
- Recebe `{ cep: "18040265" }` no body
- Faz `fetch('https://viacep.com.br/ws/18040265/json/')` no servidor
- Retorna o JSON do ViaCEP diretamente
- Trata erros (CEP invalido, timeout, etc.)

