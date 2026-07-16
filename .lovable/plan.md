Plano para corrigir o link do imóvel:

1. No card “Link do site” do CRM, trocar o final da URL para usar `imovel.id` diretamente.
   - De: `/imovel/{codigo_imoview ou código gerado}`
   - Para: `/imovel/{id do imóvel}`

2. Remover a dependência de `uuidToCode` nessa tela, porque ela gera um número e não o ID real.

3. Manter o comportamento atual:
   - clicar no link copia a URL;
   - botão “Abrir no site” abre em nova aba.

4. Conferir que a página pública já aceita UUID em `/imovel/:codigo`, pois `detalhesImovel` busca pelo campo `id` quando o parâmetro é um UUID.