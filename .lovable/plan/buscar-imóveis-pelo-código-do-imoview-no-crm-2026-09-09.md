# Buscar imóveis pelo código do Imoview no CRM

## O que está acontecendo

A caixa de busca da tela Imóveis do CRM procura apenas por título, bairro, cidade e código interno (VIP0001...). Os imóveis vindos do Imoview não têm código interno — eles têm o código numérico do Imoview. Por isso, ao digitar 3994 a lista fica vazia, mesmo o imóvel existindo (confirmado no banco: 3994 = Apartamento à venda, 2 quartos, Vila Hortência, Sorocaba/SP, ativo e disponível).

## O que será feito

- Quando o texto digitado for um número, a busca também vai procurar pelo código do Imoview, além de título, bairro, cidade e código interno.
- Continua funcionando normalmente a busca por texto (nome do bairro, título etc.).
- A busca rápida do topo (Buscar leads, imóveis) recebe o mesmo comportamento, para não dar resultado vazio ao digitar um código numérico.

## Detalhes técnicos

- `src/crm/pages/Imoveis.tsx`: no bloco `qDebounced`, acrescentar `codigo_imoview.eq.<n>` ao `.or(...)` quando o termo, sem caracteres não numéricos, resultar num inteiro válido.
- Verificar o componente de busca global do CRM e aplicar o mesmo acréscimo ao filtro de imóveis.
- Sem mudanças de banco de dados.
