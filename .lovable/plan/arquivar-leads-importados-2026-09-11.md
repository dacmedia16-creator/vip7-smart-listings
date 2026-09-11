# Arquivar leads importados

Objetivo: tirar da frente os leads antigos vindos de importação, deixando a lista com os leads novos. Nada é apagado — tudo continua guardado e acessível pelo filtro "Arquivados".

## O que será arquivado

- Os 123 leads com origem "Importado"
- Os 1.745 leads criados em 07/06/2026 marcados como "Manual" (a leva da migração)

Total: 1.868 leads arquivados. Os demais (portal, site, indicação e tudo criado depois) continuam aparecendo normalmente.

## Como fica na tela de Leads

- Por padrão a lista mostra só os leads não arquivados
- Novo filtro "Situação": Ativos (padrão) / Arquivados / Todos
- Botão "Arquivar" e "Restaurar" no lead, para ajustar caso a caso
- O contador de resultados passa a refletir só o que está sendo mostrado

## Onde mais os arquivados somem

- Funil (quadro de status)
- Painel inicial (contadores e gráficos)
- Busca global do CRM

Relatórios continuam considerando tudo, para não distorcer histórico.

## Detalhes técnicos

- Nova coluna `arquivado boolean not null default false` em `public.leads`, com índice em `(arquivado, created_at desc)`
- Atualização de dados: `arquivado = true` para `origem = 'importado'` e para `origem = 'manual' AND created_at::date = '2026-06-07'`
- `src/crm/pages/Leads.tsx`: estado `situacao` ('ativos' | 'arquivados' | 'todos') aplicado como `.eq('arquivado', ...)`, mais ações de arquivar/restaurar
- `src/crm/pages/Funil.tsx`, `src/crm/pages/Dashboard.tsx` e `src/crm/components/GlobalSearch.tsx`: filtram `arquivado = false`
- Funções de painel `dashboard_funil_counts`, `dashboard_leads_por_dia`, `dashboard_pipeline_total` e `dashboard_ranking_corretores` passam a ignorar arquivados
