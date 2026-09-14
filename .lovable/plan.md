# VIP0013 não aparece na tela de Portais

## Causa (confirmada no banco)

O VIP0013 existe, está ativo e **já está marcado para publicar no Zap/VivaReal**. Ele não aparece na tela porque a tela de Portais carrega no máximo 1.000 imóveis, e hoje existem 1.189 imóveis ativos.

A lista é carregada em ordem alfabética de título. O título do VIP0013 ("Casa em Condomínio à venda, 3 quartos, Recreio dos Sorocabanos, Sorocaba/SP") fica na posição ~1.007 — ou seja, fora do bloco carregado. Qualquer busca ou filtro nessa tela só enxerga os 1.000 primeiros.

Consequências além da busca: as contagens de publicados por portal (Zap "248 publicados") e o aviso de "176 imóveis com dados faltando" também estão calculados só sobre esses 1.000.

O envio ao portal não é afetado: o arquivo enviado ao Zap é gerado no servidor e já inclui o VIP0013.

## Correção

1. Carregar **todos** os imóveis ativos na tela de Portais, buscando em páginas de 1.000 até acabar, em vez de uma única leitura limitada.
2. Com isso, busca, filtros, contagens de publicados e o aviso de dados faltando passam a refletir o total real.

## Detalhes técnicos

- `src/crm/pages/Portais.tsx`, função `load()`: a consulta a `imoveis_proprios` usa `.eq('ativo', true).order('titulo')` sem paginação e cai no limite padrão de 1.000 linhas do PostgREST. Substituir por um laço com `.range(offset, offset + 999)` acumulando resultados até retornar menos de 1.000.
- Mesma checagem para `imovel_portais` (hoje também sem paginação) — aplicar o mesmo laço, já que o número de vínculos pode passar de 1.000.
- Sem mudanças no banco, no feed dos portais ou no site.

## Verificação

- Buscar "VIP0013" na tela de Portais e confirmar que ele aparece com o Zap ligado.
- Conferir que o contador de publicados do Zap sobe para o número real.
