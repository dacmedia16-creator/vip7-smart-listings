# Mais filtros na tela de Portais

Hoje a tela de Portais só permite buscar por texto, filtrar por portal e por status. Vamos ampliar para facilitar escolher lotes de imóveis para publicar.

## Novos filtros

1. **Faixa de valor** — dois campos "De R$" e "Até R$" com máscara de moeda brasileira (mesma usada no cadastro de imóveis). Vazio = sem limite.
2. **Cadastro recente** — seleção de período: Qualquer data / Últimos 7 dias / Últimos 30 dias / Últimos 90 dias.
3. **Ordenação** — Mais recentes primeiro (novo padrão), Mais antigos, Maior valor, Menor valor, Título A–Z.
4. **Finalidade** — Todas / Venda / Aluguel / Venda e aluguel.
5. **Tipo de imóvel** — lista montada a partir dos tipos existentes nos imóveis carregados.
6. **Cidade** — lista montada a partir das cidades dos imóveis carregados.

Todos os filtros combinam entre si e com a busca por texto e os filtros de portal/status já existentes. O contador ao lado ("469 imóveis") continua refletindo o resultado filtrado.

Também será incluído um botão **Limpar filtros** que aparece quando algum filtro está ativo.

## Detalhes técnicos

- Arquivo: `src/crm/pages/Portais.tsx`.
- A consulta atual não traz as datas; incluir `created_at` e `data_atualizacao_origem` no `select` de `imoveis_proprios` e no tipo `ImovelLite`.
- "Cadastro recente" usa `created_at`; ordenação "Mais recentes" também.
- Filtragem e ordenação continuam client-side no `useMemo` existente (a lista já vem inteira do banco).
- Campos de valor reutilizam `MoneyInput` (`src/crm/components/MoneyInput.tsx`).
- Listas de cidade e tipo são derivadas com `useMemo` sobre `imoveis`, ordenadas alfabeticamente.
- A barra de filtros passa a ser um grid responsivo para caber os novos controles sem quebrar em telas menores.
- Nenhuma mudança em banco de dados, feeds de portais ou regras de publicação.
