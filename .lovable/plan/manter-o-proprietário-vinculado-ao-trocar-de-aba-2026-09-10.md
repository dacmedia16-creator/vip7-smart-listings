# Manter o proprietário vinculado ao trocar de aba

## Problema

Ao criar um anúncio novo, o proprietário adicionado na aba "Relacionamentos" desaparece quando você vai para outra aba e volta.

Causa confirmada no código: enquanto o imóvel ainda não foi salvo, o proprietário fica guardado apenas dentro do bloco da aba. Quando a aba sai da tela, esse bloco é descartado e a lista volta vazia — e, ao voltar, ela ainda avisa o formulário de que "não há proprietários", apagando também o que estava reservado para salvar.

## Correção

1. Guardar a lista de proprietários pendentes no próprio formulário do imóvel (nível da página), não dentro da aba. Assim ela sobrevive à troca de abas.
2. O bloco de proprietários passa a apenas exibir e alterar essa lista, sem manter cópia própria e sem zerar nada ao ser recriado.
3. Mostrar um contador na aba "Relacionamentos" quando houver proprietários aguardando o salvamento, para ficar visível que o vínculo está reservado.
4. Ao salvar o imóvel, os pendentes continuam sendo gravados como proprietários (comportamento atual mantido), e a lista pendente é limpa após a gravação.
5. Se o rascunho já tiver sido salvo automaticamente (imóvel já existe), o vínculo continua indo direto para o banco, como hoje.

## Detalhes técnicos

- `src/crm/pages/ImovelForm.tsx`: `pendingProprietarios` vira a fonte de verdade e é passado para o componente filho junto com um setter; limpar após o `addVinculo` em lote no submit.
- `src/crm/components/ProprietariosSection.tsx`: remover o estado local `pending` e o `useEffect` que chama `onPendingChange` no mount (é ele que zera a lista); operar sobre as props em modo criação.
- Nenhuma mudança de banco de dados.

## Verificação

Criar um anúncio, adicionar proprietário, alternar entre abas, voltar e confirmar que ele permanece; salvar e confirmar o vínculo no imóvel.
