# Não enviar o número do endereço para os portais

## Objetivo
Quando "Mostrar endereço" estiver ligado, enviar o **logradouro (rua)** mas **sem o número** — apenas rua, bairro, cidade, estado e CEP.

## Mudança
Editar o edge function `supabase/functions/portal-feed/index.ts` nos três formatos de feed:

1. **VRSync (Zap/VivaReal/OLX)** — remover a linha que gera `<StreetNumber>` (linha ~196). A rua (`<Address>`) continua sendo enviada.
2. **ImovelWeb** — remover a linha que gera `<numero>` (linha ~263). O `<logradouro>` continua.
3. **Chaves na Mão** — remover a linha que gera `<numero>` (linha ~311). O `<endereco>` continua.

Também ajustar `mapDisplayAddress` em `vrsync-maps.ts` para que a verificação de "Street" não exija mais o `numero` — basta `mostrar && endereco` para retornar `'Street'`. Assim o endereço com rua (sem número) ainda é enviado como `displayAddress="Street"`.

## O que NÃO muda
- O campo "Mostrar endereço" continua funcionando igual.
- Rua, bairro, cidade, estado e CEP continuam sendo enviados.
- O formulário do CRM não é alterado.
- O número continua salvo no banco — apenas não é enviado ao feed.

## Após editar
Deploy da edge function `portal-feed` para a mudança ter efeito nos feeds públicos.
