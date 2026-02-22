

## Usar campos opcionais como filtros de comparaveis

### Problema atual

Os campos opcionais do formulario (Area Total, Area Construida, Quartos, Banheiros, Vagas) sao enviados para o prompt da IA, mas **nao sao usados para filtrar** os imoveis comparaveis. Isso significa que um apartamento de 2 quartos pode ser comparado com casas de 5 quartos, gerando estimativas imprecisas.

### Solucao

Adicionar filtros no pos-processamento (`.filter()`) da edge function `avaliacao-ia` para priorizar imoveis com caracteristicas similares. Os filtros serao **flexiveis** (com margem de tolerancia) para nao eliminar comparaveis demais.

### Arquivo: `supabase/functions/avaliacao-ia/index.ts`

Alteracoes no filtro de comparaveis (apos linha 183):

- **Quartos**: se informado, aceitar comparaveis com +/- 1 quarto de diferenca
- **Banheiros**: se informado, aceitar comparaveis com +/- 1 banheiro
- **Vagas**: se informado, aceitar comparaveis com +/- 1 vaga
- **Area (total ou construida)**: se informada, aceitar comparaveis com area entre 50% e 200% do valor informado

A logica sera: se o usuario informou o campo, filtrar com tolerancia. Se nao informou, nao filtrar por esse criterio. Caso os filtros sejam muito restritivos e eliminem todos os comparaveis, fazer fallback sem esses filtros e avisar na analise.

### Detalhes Tecnicos

```text
Filtros adicionais no .filter():
- quartos informado? -> aceitar p.quartos entre (quartos-1) e (quartos+1)
- banheiros informado? -> aceitar p.banheiros entre (banheiros-1) e (banheiros+1)  
- vagas informado? -> aceitar p.vagas entre (vagas-1) e (vagas+1)
- area informada? -> aceitar p.area entre (area*0.5) e (area*2.0)

Fallback: se filtros resultarem em 0 comparaveis, repetir sem filtros de quartos/banheiros/vagas/area
```

Os valores de tolerancia foram escolhidos para manter relevancia sem ser restritivo demais. Por exemplo, se o usuario tem 3 quartos, comparar com imoveis de 2 a 4 quartos e razoavel.

