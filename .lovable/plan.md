## Plano

1. **Corrigir a exibição no CRM**
   - Ajustar a listagem de **Imóveis Próprios** e o detalhe do imóvel no CRM para converter qualquer caminho/URL salva em `fotos` para URL pública válida antes de renderizar a imagem.
   - Adicionar fallback visual quando a imagem falhar, para não aparecer o ícone quebrado do navegador.

2. **Corrigir a sincronização futura**
   - Revisar a função de importação do Imoview para garantir que as fotos sejam salvas em um formato consistente e utilizável pelo CRM/site.
   - Manter as URLs originais quando o download para o storage não for necessário ou falhar.

3. **Verificar dados existentes**
   - Conferir alguns imóveis importados que já têm `fotos` no banco e validar que o card passa a carregar a primeira foto corretamente.

## Detalhe técnico

O banco já tem fotos importadas, mas o card do CRM usa `im.fotos[0]` diretamente. Se esse valor for caminho de storage, URL com caracteres/query problemática, ou uma URL que falha no navegador, a imagem quebra como no print. A correção centraliza a normalização da URL e adiciona tratamento de erro no `<img>`.