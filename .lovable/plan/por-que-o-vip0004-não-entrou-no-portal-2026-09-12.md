# Por que o VIP0004 não entrou no portal

## O que encontrei

O imóvel VIP0004 está sim no arquivo enviado ao Zap/VivaReal (conferi o arquivo agora: ele aparece lá, sem marcação de erro, último envio hoje às 19:08). O problema está nas **fotos**.

Para os imóveis cadastrados por nós, com fotos enviadas pelo sistema, o arquivo do portal está mandando só o nome do arquivo (ex.: `101ac1da-....jpg`) em vez do endereço completo da imagem (`https://.../imoveis-fotos/...jpg`). O portal não consegue baixar nenhuma foto e por isso descarta o anúncio.

No site isso não aparece porque o site monta o endereço completo da imagem na hora de exibir; o arquivo enviado aos portais não faz essa conversão.

Hoje isso afeta 2 imóveis publicados (os cadastrados manualmente). Os vindos do Imoview já têm o endereço completo salvo e não são afetados.

## Correção

1. No arquivo enviado aos portais, converter cada foto para o endereço público completo quando ela estiver salva apenas como nome/caminho do arquivo — a mesma regra que o site já usa. Vale para Zap/VivaReal, OLX, ImovelWeb e Chaves na Mão.
2. Passar a exigir pelo menos 1 foto com endereço válido na validação, para que um caso assim apareça como erro na tela de Portais em vez de sair silenciosamente quebrado.

## Detalhes técnicos

- `supabase/functions/portal-feed/index.ts`: criar `fotoUrl(v)` que devolve `v` quando começa com `http`, senão monta `${SUPABASE_URL}/storage/v1/object/public/imoveis-fotos/${v}`; aplicar nos três geradores (`buildVRSync`, `buildImovelWeb`, `buildChavesNaMao`).
- Sem mudanças no banco e sem alteração no site.

## Verificação

- Baixar o feed do Zap e conferir que as imagens do VIP0004 saem como `https://...`.
- Conferir que o total de anúncios do feed continua o mesmo (214).
