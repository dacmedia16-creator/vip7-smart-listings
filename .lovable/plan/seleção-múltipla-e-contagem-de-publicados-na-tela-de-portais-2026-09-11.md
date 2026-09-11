# Seleção múltipla e contagem de publicados na tela de Portais

Na tela **Portais Imobiliários**, permitir selecionar vários imóveis de uma vez para publicar/despublicar em lote e mostrar claramente quantos imóveis estão publicados em cada portal.

## O que será feito

1. **Seleção múltipla (`src/crm/pages/Portais.tsx`)**
   - Nova coluna de checkbox à esquerda de cada linha da tabela.
   - Checkbox no cabeçalho "Selecionar todos" que seleciona apenas os imóveis da lista filtrada atual (respeita busca e filtros ativos).
   - Linhas selecionadas ganham destaque visual.

2. **Barra de ações em lote** (aparece quando há 1+ selecionados)
   - Mostra a contagem: "12 selecionados".
   - Para cada portal (Zap/VivaReal, OLX, ImovelWeb, Chaves na Mão): botões **Publicar** e **Despublicar** aplicados a todos os selecionados.
   - Publicar em lote pula automaticamente os imóveis com erro de validação e avisa quantos foram pulados.
   - Botão **Limpar seleção**.
   - Seleção é limpa ao mudar busca/filtros para evitar ações em itens fora da tela.

3. **Contagem de publicados**
   - No cabeçalho de cada coluna de portal da tabela, badge com o total de publicados naquele portal (ex.: "Zap · 45"), atualizado em tempo real conforme marca/desmarca.
   - Os cards do topo já mostram a contagem por portal — serão mantidos e seguem o mesmo número.

## Detalhes técnicos

- Publicar/despublicar em lote faz upsert em `imovel_portais` com todas as linhas de uma vez (onConflict `imovel_id,portal`), atualizando o estado local sem recarregar a página.
- Imóveis com erro de validação são excluídos do lote de publicação e contados no toast ("3 pulados por dados faltando").
- Nenhuma migration ou mudança de banco.

## Validação

- Build OK.
- Selecionar vários, publicar no Zap em lote, conferir contagem subindo no cabeçalho e no card; despublicar em lote funciona; filtros + "selecionar todos" pegam só os filtrados.
