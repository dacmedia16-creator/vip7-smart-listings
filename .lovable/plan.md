# Mostrar o código dos imóveis nos cards do CRM

## O problema

Na lista de imóveis do CRM, o card mostra um traço "—" no lugar do código. Isso acontece porque o card só usa o **código interno** (VIP0001, etc.), e a maioria dos imóveis não tem esse campo: dos 1.595 imóveis, 1.215 têm código interno e 1.593 têm código Imoview. Os imóveis importados do Imoview aparecem sem código porque o card ignora o código Imoview.

## O que muda

- O card passa a mostrar o código interno quando existir; se não existir, mostra o código Imoview (ex.: "1835").
- Só mostra "—" no caso raro de o imóvel não ter nenhum dos dois.
- Quando existirem os dois códigos, mostra o interno e o Imoview em seguida, ex.: "VIP0001 · 1835 · Apartamento".
- Nada mais muda: título, foto, preço, bairro e demais informações continuam iguais.

## Detalhes técnicos

- Arquivo: `src/crm/pages/Imoveis.tsx`, linha do card (`codigo_interno || '—'`).
- Montar a etiqueta a partir de `[codigo_interno, codigo_imoview].filter(Boolean).join(' · ')` com fallback `'—'`, concatenando `· {tipo}`.
- `codigo_imoview` já vem no `select` da consulta usada pela lista (a busca numérica por esse campo já existe), sem mudanças de dados ou de banco.
