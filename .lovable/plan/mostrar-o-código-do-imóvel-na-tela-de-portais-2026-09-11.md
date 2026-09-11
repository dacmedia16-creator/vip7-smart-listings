# Mostrar o código do imóvel na tela de Portais

Hoje a lista de Portais mostra só o título, tipo, finalidade e preço. O código do imóvel (VIP e o código Imoview) não aparece, o que dificulta localizar o anúncio certo.

## O que muda

- Cada linha da lista passa a exibir o código do imóvel logo acima do título, no mesmo formato usado nas outras telas: `VIP0042 · 1835`.
- Quando o imóvel tiver só um dos códigos, mostra apenas o disponível.
- A busca no topo da página passa a encontrar imóveis também pelo código (digitar `1835` ou `VIP0042` filtra a lista).

## Detalhes técnicos

- `src/crm/pages/Portais.tsx`: incluir `codigo_interno` e `codigo_imoview` no `select` da consulta e no tipo local do imóvel.
- Renderizar uma linha de código (texto pequeno, cor `muted-foreground`) acima de `im.titulo` na célula "Imóvel".
- Estender o filtro de texto para considerar `codigo_interno` e `codigo_imoview` além de título, cidade e bairro.
- Nenhuma alteração de banco de dados ou nos feeds enviados aos portais.
