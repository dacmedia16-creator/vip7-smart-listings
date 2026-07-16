# Endereço completo na página do imóvel (CRM)

Hoje o cabeçalho mostra só `endereço, bairro, cidade`. Atualizar para incluir número, complemento, estado e CEP.

## Mudança

`src/crm/pages/ImovelDetail.tsx` (linha 117):

Substituir a linha atual por uma composição:
- `endereco, nº numero` (junta na mesma parte se número existir)
- `complemento` (se existir)
- `bairro`
- `cidade/UF`
- `CEP xxxxx-xxx` (se existir)

Cada parte separada por `·` para não truncar visualmente e permitir exibir o endereço completo. Fallback continua "Sem endereço".
