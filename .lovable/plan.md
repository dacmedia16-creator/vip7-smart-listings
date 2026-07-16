Vou ajustar a geração do link para resolver os dois pontos que ainda impedem o funcionamento:

1. **Link final sempre com ID do imóvel**
   - No CRM, o link copiado/aberto continuará apontando para o preview especial, mas o destino final será sempre:
     `https://vipsevenimoveis.com.br/imovel/{id-do-imovel}`
   - Isso evita usar código Imoview, código interno ou número gerado.

2. **Página pública aceitar o ID real do imóvel**
   - Hoje a página pública `/imovel/:codigo` recebe o parâmetro, mas o objeto carregado não preserva o `id` do banco.
   - Vou incluir o `id` no mapeamento do imóvel para garantir que propriedades cadastradas no CRM funcionem pelo UUID real.

3. **Preview do WhatsApp com foto principal e características**
   - A função de metadata vai buscar o imóvel pelo ID.
   - A imagem será a primeira foto do imóvel.
   - A descrição do preview será montada com as principais características: tipo, finalidade, bairro/cidade, preço, quartos, banheiros, vagas e área quando existirem.
   - Também vou converter fotos salvas como caminho do storage para URL pública absoluta, para o WhatsApp conseguir carregar a imagem.

4. **Evitar cache atrapalhando o teste**
   - O link gerado no CRM terá um parâmetro de versão/cache para forçar nova leitura do preview.

Depois disso, ao copiar/abrir o “Link do site” no CRM, o final do destino será o ID do imóvel e o compartilhamento deverá exibir a foto principal e as características no WhatsApp.