# Fotos nos condomínios

Adicionar upload de fotos ao cadastro de condomínios, no mesmo padrão já usado nos imóveis.

## O que muda

- No formulário de novo/editar condomínio, uma área "Fotos" com botão **Adicionar fotos** (seleção múltipla).
- Miniaturas das fotos enviadas, com botão de remover em cada uma.
- A primeira foto é a **foto de capa** do condomínio; é possível reordenar definindo outra como capa.
- Na lista de condomínios, a capa aparece como miniatura ao lado do nome.
- Enviar/remover fotos: qualquer usuário do CRM. Excluir o condomínio continua só para admin/gestor.

## Detalhes técnicos

- Migration: adicionar coluna `fotos text[]` (default `'{}'`) em `condominios_cache`.
- Arquivos vão para o bucket público existente `imoveis-fotos`, sob o prefixo `condominios/<codigo>/<uuid>.<ext>`, reaproveitando o fluxo de `ImovelForm.tsx`.
- Políticas de storage: garantir insert/delete em `storage.objects` para usuários autenticados nesse bucket (verificar as políticas atuais antes de criar).
- `src/crm/pages/Condominios.tsx`: estado de upload, grade de miniaturas, remoção (apaga do bucket e do array), e miniatura na tabela.
- URLs salvas como URL pública completa, como já é feito nos imóveis.
