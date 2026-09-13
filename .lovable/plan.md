# Corrigir erros de download de fotos no Zap/VivaReal

## Diagnóstico (confirmado)

O relatório do Zap mostra "Máximo de tentativa alcançada no download da imagem" porque as fotos desses anúncios apontam para o CDN do Imoview (`cdn.imoview.com.br/...?token`), não para o nosso armazenamento. O crawler do Zap não consegue baixar dessas URLs (bloqueio/timeout de bot), enquanto as fotos hospedadas por nós (`imoveis-fotos`) funcionam.

- 214 imóveis publicados no feed do Zap; **152 ainda usam URLs do CDN do Imoview** (1.083 ativos no total no banco).
- Dos 6 códigos do relatório, só **1749 e 1836** ainda estão no feed — os outros 4 (1799, 1784, 1785, 1783) já saíram do arquivo, então esses erros são antigos e vão sumir sozinhos do painel do Zap.

## O que será feito

1. **Copiar as fotos do CDN do Imoview para o nosso armazenamento** (`imoveis-fotos/<codigo>/<arquivo>`) para todos os imóveis publicados em pelo menos um portal (começando pelos 152 do Zap; a mesma rotina cobre OLX, ImovelWeb e Chaves na Mão).
   - Baixar cada foto da URL atual, enviar ao bucket e substituir a URL no campo `fotos` do imóvel.
   - Processar em lotes (ex.: 5 imóveis por execução) com registro de progresso, para poder rodar repetidas vezes até concluir sem estourar tempo.
   - Fotos já hospedadas por nós são ignoradas; falhas de download são registradas e a URL original é mantida.

2. **Resultado esperado**
   - O feed passa a enviar só URLs do nosso armazenamento, que o Zap baixa sem erro.
   - Site e CRM continuam exibindo as mesmas fotos (só muda a origem do arquivo).
   - Os erros de 1799/1784/1785/1783 desaparecem sozinhos por serem de anúncios fora do feed.

3. **Verificação**
   - Após a cópia, conferir no banco que nenhum imóvel publicado tem URL `cdn.imoview.com.br` e testar o feed (`portal-feed/zap`) validando que as URLs de foto respondem 200.

## Detalhes técnicos

- Nova edge function `migrar-fotos-portais` (ou extensão da `imoview-sync`) usando a service role para gravar no bucket `imoveis-fotos` e atualizar `public.imoveis_proprios.fotos`.
- Execução chamada repetidamente com `?offset=`/cursor até `com_cdn = 0` entre os publicados.
- Sem mudanças no site, no CRM ou nas regras do feed.
