# Corrigir fotos do condomínio que aparecem quebradas no cadastro do imóvel

## O que está acontecendo

As fotos dos condomínios não estão guardadas no nosso armazenamento: as 1.326 fotos apontam para o servidor do Imoview (endereços com token). Na tela de fotos do imóvel, o sistema tenta gerar um link seguro para cada foto no nosso armazenamento; as do condomínio não existem lá e o cálculo dos links sai desalinhado, então várias fotos (inclusive as suas, recém-enviadas) ficam em branco.

## O que será feito

1. Corrigir o cálculo dos links da galeria: cada foto passa a receber o seu próprio link, sem embaralhar. Foto que não é do nosso armazenamento é exibida pelo endereço original.
2. Copiar as fotos dos condomínios para o nosso armazenamento, uma única vez, e atualizar as fichas dos condomínios para apontarem para a cópia. Assim elas param de depender do servidor do Imoview (que também é o que causava erro de download nos portais).
3. Passar a usar essas cópias ao puxar as fotos do condomínio para um imóvel novo.

Depois disso, ao escolher um condomínio já cadastrado, as fotos dele aparecem normalmente junto com as suas, sem quadros em branco.

## Detalhes técnicos

- `src/crm/pages/ImovelForm.tsx`, efeito de `photoUrls`: hoje `missing.forEach((foto, i) => data[i])` usa o índice de `missing` enquanto `createSignedUrls` recebeu apenas os caminhos válidos (`paths`) — desalinhamento sempre que há URL externa. Trocar por um mapa `path -> signedUrl` e resolver cada foto pelo seu próprio path; URLs externas (`^https?://` sem `/imoveis-fotos/`) vão direto para `photoUrls[foto] = foto`.
- Adicionar `onError` no `<img>` da grade para cair no endereço original em vez de ficar em branco.
- Edge function de migração (reaproveitando o padrão de `migrar-fotos-portais`): para cada `condominios_cache.fotos` com `cdn.imoview.com.br`, baixar e gravar em `imoveis-fotos` sob `condominios/<codigo>/<NN>-<slug>.<ext>`, e reescrever o array com as URLs públicas. Falha de download mantém a URL original.
- `preencher_fotos_condominios()` continua como está para condomínios ainda sem foto; a migração cobre o que já foi preenchido.
