# Mostrar código do imóvel no cabeçalho do detalhe

## Problema
No cabeçalho da página de detalhe do imóvel (CRM), só aparece o código interno (`codigo_interno`). Imóveis importados que só têm código Imoview não mostram código nenhum — como no caso da foto, onde aparece apenas "Apartamento".

## Mudança
Em `src/crm/pages/ImovelDetail.tsx`, linha 118, o cabeçalho passa a exibir:

- Código interno (VIP0001...) e/ou código Imoview, com fallback entre os dois.
- Formato: `VIP0042 · 1835 · Apartamento` — se só existir um, mostra só ele; se não existir nenhum, mostra apenas o tipo.

Exemplos de resultado:
- Só Imoview: `1835 · Apartamento`
- Ambos: `VIP0042 · 1835 · Apartamento`
- Só interno: `VIP0042 · Apartamento`

## Verificação
Abrir o detalhe de um imóvel importado (ex.: código 1835) e de um cadastrado manualmente, conferindo o código no cabeçalho.
