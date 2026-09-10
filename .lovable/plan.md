# Painel de fotos dos condomínios

Hoje as fotos do condomínio só podem ser mexidas dentro do formulário de edição (e na lista dá para trocar apenas a capa). A ideia é ter uma tela dedicada à galeria de cada condomínio.

## O que será feito

Na lista de Condomínios, cada item ganha o botão **Fotos**, que abre um painel grande (galeria) com:

- Todas as fotos do condomínio em miniaturas, com contador ("12 fotos")
- **Enviar fotos**: escolher vários arquivos de uma vez, com barra de progresso e envio para o armazenamento do condomínio
- **Arrastar para reordenar** as miniaturas; a primeira posição é a capa
- **Definir como capa** direto na miniatura (move a foto para o primeiro lugar)
- **Excluir**: pede confirmação e apaga a foto de vez — sai da lista e o arquivo é removido do armazenamento (só quando o arquivo é nosso; fotos vindas do Imoview, que ficam em servidor externo, apenas saem da lista)
- **Excluir selecionadas**: marcar várias miniaturas e apagar de uma vez
- Clicar na foto abre em tamanho maior

Tudo é salvo na hora, sem precisar abrir o formulário de edição. A capa exibida na lista de condomínios continua sendo a primeira foto.

## Permissões

Enviar, reordenar e definir capa: qualquer usuário do CRM (mesma regra de edição de hoje).
Excluir fotos: mesma regra de exclusão de condomínio já existente (admin/gestor).

## Detalhes técnicos

- Novo componente `src/crm/components/CondominioFotosDialog.tsx`, usado a partir de `src/crm/pages/Condominios.tsx`.
- Fonte dos dados: coluna `fotos text[]` de `condominios_cache`; arquivos no bucket público `imoveis-fotos`, prefixo `condominios/<codigo>/<uuid>.<ext>`.
- Upload múltiplo em paralelo com limite de concorrência, validação de tipo de imagem e limite de tamanho por arquivo.
- Exclusão: extrai o path do bucket a partir da URL (`/imoveis-fotos/...`), chama `storage.remove()` e depois atualiza o array `fotos`. URLs externas (Imoview) só saem do array.
- Reordenar/capa: atualiza o array completo em `condominios_cache.fotos` via `update`.
- Invalida a query `['condominios-cache']` após cada mudança; toasts de sucesso/erro.
- Nenhuma mudança de schema é necessária; políticas de escrita em `storage.objects` para o bucket serão conferidas e, se faltar permissão de remoção para usuários do CRM, será criada a política correspondente por migration.
