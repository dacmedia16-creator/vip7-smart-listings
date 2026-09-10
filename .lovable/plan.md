# Mostrar valores na lista de Portais

## O que fazer
Na tabela de imóveis da tela **Portais Imobiliários**, exibir o preço formatado em R$ (ex.: R$ 550.000) junto de cada imóvel, na linha abaixo do tipo/finalidade.

## Detalhes técnicos
- Em `src/crm/pages/Portais.tsx`, adicionar o valor formatado com `toLocaleString('pt-BR')` na coluna do imóvel (linha do `tipo · finalidade`), mostrando `—` quando não houver preço.
- O campo `preco` já é carregado na consulta — sem mudança de dados.
