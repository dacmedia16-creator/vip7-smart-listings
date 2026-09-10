# Máscara de moeda (R$) nos campos de valores do imóvel

## Objetivo
Ao digitar o preço e demais valores em dinheiro no formulário do imóvel, exibir já formatado em reais (ex.: digitar 550000 mostra `550.000,00`), em vez do campo numérico cru.

## Campos afetados (aba "Valores" do ImovelForm)
- Venda (R$) — `preco`
- Valor anterior — `valor_anterior`
- Condomínio (R$) — `condominio`
- IPTU mensal — `iptu_mensal`
- IPTU anual — `iptu_anual`
- Valor avaliação — `valor_avaliacao`

Campos de porcentagem (rentabilidade %, comissão %) permanecem numéricos simples.

## Como será feito
1. Criar um componente reutilizável `MoneyInput` (em `src/crm/components/MoneyInput.tsx`):
   - input de texto que formata em tempo real com separador de milhar `.` e decimais `,` (padrão brasileiro, sem símbolo fixo para não atrapalhar a digitação — o label já diz "R$");
   - converte o texto digitado para número ao salvar no formulário (react-hook-form continua recebendo `number`, sem mudar validação nem o envio ao banco);
   - ao abrir um imóvel existente, mostra o valor já formatado.
2. Trocar os 6 campos listados no `ImovelForm.tsx` para usar o `MoneyInput` (o campo `preco` hoje usa `Input type="number"`; os demais usam o helper `T(..., 'number')` — adicionar um helper `Money(...)` ou variant para esses campos).
3. Verificar build e testar digitação/edição na aba Valores.

## Fora de escopo
- Nenhuma mudança no banco de dados nem nos valores já salvos.
- Outras telas (condomínios, leads) não serão alteradas.
