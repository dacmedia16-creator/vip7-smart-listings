# Mostrar endereço nos portais

Hoje o sistema tem um controle "Mostrar endereço" por imóvel, mas ele não aparece em nenhuma tela e está desligado em todos os imóveis. Por isso os portais recebem só bairro, cidade, estado e CEP.

## O que será feito

1. **Novo controle na aba Endereço do cadastro do imóvel**
   Um botão liga/desliga "Mostrar endereço completo nos portais", com explicação curta: quando ligado, rua e número são enviados aos portais; quando desligado, só bairro/cidade/estado/CEP.

2. **Ligar/desligar em lote na tela de Portais**
   Na seleção múltipla já existente, duas novas ações: "Mostrar endereço" e "Ocultar endereço" para todos os imóveis selecionados.

3. **Coluna indicativa**
   Na tabela de Portais, um indicador simples mostrando se o imóvel envia o endereço completo, para você conferir rapidamente.

Nenhum imóvel será alterado automaticamente — você decide quais liberam o endereço.

## Detalhes técnicos

- Campo existente: `imoveis_proprios.mostrar_endereco` (boolean, default false). Nenhuma migração necessária.
- `src/crm/pages/ImovelForm.tsx`: adicionar Switch controlado na aba Endereço, incluído no state do formulário e nos payloads de insert/update/auto-save.
- `src/crm/pages/Portais.tsx`: incluir `mostrar_endereco` no select, adicionar coluna com badge, e ações em lote via update em `imoveis_proprios` para os IDs selecionados, atualizando o estado local após sucesso.
- `supabase/functions/portal-feed/index.ts` já respeita o campo (Zap/VivaReal, OLX e demais) — sem alterações.
