

## Correcao: Limite de registros da API Imoview na funcao avaliacao-ia

### Problema

A edge function `avaliacao-ia` envia `numeroRegistros: 50` para a API Imoview, mas a API so aceita no maximo 20 registros por pagina. Isso causa um erro 404 e a estimativa nunca e gerada.

### Solucao

Alterar a edge function para respeitar o limite de 20 registros por pagina e fazer paginacao (3 paginas de 20 = 60 imoveis) para ter dados suficientes para a analise.

### Arquivo: `supabase/functions/avaliacao-ia/index.ts`

1. Substituir a chamada unica com `numeroRegistros: 50` por um loop de paginacao que busca ate 3 paginas de 20 registros cada
2. Acumular os resultados de todas as paginas antes de filtrar e enviar para a IA

### Detalhes Tecnicos

- Trocar `numeroRegistros: 50` por `numeroRegistros: 20`
- Fazer loop buscando paginas 1, 2 e 3 (ate 60 imoveis)
- Parar de paginar quando a API retornar menos de 20 resultados (significa que acabaram os dados)
- Manter todo o restante da logica igual (filtragem por cidade/bairro/tipo e analise por IA)

