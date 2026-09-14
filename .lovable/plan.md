# Puxar as fotos do condomínio ao cadastrar o imóvel

Hoje, ao escolher um condomínio já cadastrado no formulário do imóvel, só o nome, o código e a cidade são aproveitados. As fotos do condomínio não entram em lugar nenhum.

## O que muda

- Ao selecionar um condomínio no campo "Condomínio (nome)", as fotos daquele condomínio são adicionadas automaticamente à galeria do imóvel, no final da lista (as fotos próprias continuam na frente, a capa não muda).
- Fotos repetidas não são adicionadas duas vezes.
- Um aviso curto confirma quantas fotos do condomínio foram adicionadas.
- Se você trocar de condomínio, as fotos do condomínio anterior saem da lista e entram as do novo. Fotos enviadas por você nunca são removidas.
- Se o condomínio não tiver foto, nada acontece.
- As fotos ficam normais na aba Fotos: dá para remover uma a uma ou reordenar como sempre.

O endereço continua como está hoje — só a cidade é preenchida quando estiver vazia.

## Detalhes técnicos

- `CondominioAutocomplete.tsx`: incluir `fotos` no `select` de `condominios_cache` e repassar no `onChange`.
- `ImovelForm.tsx`, no `onChange` do campo `condominio_nome`: manter em um ref a lista de URLs vindas do condomínio anterior; ao selecionar um novo, remover essas URLs de `fotos` e concatenar as novas (deduplicadas por URL), preservando a ordem existente.
- Só dispara quando há `codigo` selecionado da lista (digitação livre não altera fotos).
- O auto-save já observa `fotos`, então o rascunho/registro é atualizado sem mudanças adicionais.
- Sem alteração de schema nem de edge functions.
