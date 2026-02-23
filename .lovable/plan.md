
## Corrigir erro de CEP na pagina de Avaliacao

### Problema

A edge function `cep-lookup` esta retornando erro 500 ao consultar o ViaCEP. O erro esta sendo capturado no `catch` mas nao esta sendo logado, o que dificulta o diagnostico. Provavelmente o `fetch` ao ViaCEP esta falhando por conta de timeout, bloqueio de IP, ou necessidade de headers adicionais (como User-Agent).

### Solucao

Atualizar a edge function com:

1. **Adicionar logs de erro** para facilitar diagnostico futuro
2. **Adicionar header User-Agent** na requisicao ao ViaCEP (alguns servicos bloqueiam requests sem User-Agent)
3. **Adicionar fallback** usando API alternativa (BrasilAPI) caso o ViaCEP falhe
4. **Adicionar timeout** para evitar que a funcao fique travada

### Alteracoes

**Arquivo: `supabase/functions/cep-lookup/index.ts`**

- Adicionar `console.error(error)` no bloco catch para logar erros
- Adicionar header `User-Agent` no fetch ao ViaCEP
- Implementar fallback: se ViaCEP falhar, tentar `https://brasilapi.com.br/api/cep/v1/{cep}`
- Mapear campos da BrasilAPI (street, neighborhood, city) para o mesmo formato do ViaCEP (logradouro, bairro, localidade)

### Detalhes Tecnicos

A funcao tentara primeiro o ViaCEP. Se falhar, tentara a BrasilAPI como backup. Os campos da BrasilAPI serao mapeados para manter compatibilidade com o frontend existente:

```
BrasilAPI         -> ViaCEP (formato usado no frontend)
street            -> logradouro
neighborhood      -> bairro  
city              -> localidade
state             -> uf
```
