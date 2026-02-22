
## Correcao: Filtro de cidade na funcao avaliacao-ia

### Problema

A edge function `avaliacao-ia` busca imoveis da API Imoview **sem enviar filtro de cidade**. Depois tenta filtrar pelo nome da cidade no lado do servidor, mas os nomes nao batem (usuario digita "Votorantim", API retorna imoveis com cidade "Sorocaba" etc.). Resultado: **0 comparaveis** e o erro "Nao encontramos imoveis comparaveis suficientes".

### Solucao

1. **Buscar o codigo da cidade** antes de consultar imoveis - chamar a API Imoview de cidades para encontrar o `codigocidade` correto a partir do nome digitado pelo usuario
2. **Enviar `codigocidade` no payload** de busca de imoveis para que a API ja retorne apenas imoveis da cidade correta
3. **Relaxar o filtro de cidade** no pos-processamento - se a API ja filtrou por codigo, nao precisa filtrar por nome novamente
4. **Aumentar paginas** de 3 para 5 (100 imoveis) para ter mais comparaveis

### Arquivo: `supabase/functions/avaliacao-ia/index.ts`

Alteracoes:

- Adicionar chamada a `RetornarCidades` da API Imoview para resolver o nome da cidade em codigo numerico
- Incluir `codigocidade` no payload de busca de imoveis (`RetornarImoveisDisponiveis`)
- Remover o filtro de cidade do `.filter()` pos-busca (ja filtrado pela API)
- Manter filtro por tipo de imovel e valor positivo
- Aumentar MAX_PAGES para 5

### Detalhes Tecnicos

Fluxo corrigido:

```text
1. Recebe cidade="Votorantim" do formulario
2. Chama RetornarCidades na API Imoview
3. Encontra codigocidade=XX para "Votorantim"
4. Busca imoveis com codigocidade=XX + finalidade
5. API retorna apenas imoveis de Votorantim
6. Filtra por tipo e bairro (pos-processamento)
7. Envia para IA analisar
```

Se nao encontrar a cidade pelo nome, faz fallback para o comportamento atual (busca sem filtro de cidade e filtra por nome).
