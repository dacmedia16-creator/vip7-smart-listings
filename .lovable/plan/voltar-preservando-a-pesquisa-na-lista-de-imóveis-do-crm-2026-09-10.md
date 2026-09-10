# Voltar preservando a pesquisa na lista de imóveis do CRM

## Problema

Hoje, na lista **Imóveis** do CRM, a busca, os filtros aplicados, a página atual e até o painel de filtros aberto ficam apenas na memória da tela. Ao clicar num imóvel e depois em **Voltar** (na página de detalhes ou no formulário), o código navega sempre para `/crm/imoveis` do zero — a pesquisa se perde e a lista volta ao estado inicial.

## O que vamos fazer

### 1. Guardar o estado da lista (`src/crm/pages/Imoveis.tsx`)
- Persistir em `sessionStorage` (chave única, ex.: `crm-imoveis-state`): texto da busca (`q`), filtros aplicados (`filters`/`applied`), página atual (`pagina`) e se o painel de filtros está aberto.
- Ao abrir a lista, inicializar o estado a partir do que foi salvo — assim voltar para a lista restaura exatamente a mesma pesquisa, filtros e página.
- O parâmetro `?q=` da URL continua tendo prioridade quando vier (ex.: vindo da busca global ⌘K), para não quebrar esse fluxo.
- Botão "Limpar" e mudanças de filtro atualizam o estado salvo normalmente.

### 2. Voltar para "de onde veio" (`src/crm/pages/ImovelDetail.tsx` e `src/crm/pages/ImovelForm.tsx`)
- Botão **Voltar** (e **Cancelar** no formulário): usar `navigate(-1)` quando houver histórico dentro do app (`location.key !== 'default'`), caindo para `/crm/imoveis` apenas quando a página foi aberta diretamente (link colado, nova aba).
- Após **excluir** um imóvel, continuar navegando para `/crm/imoveis` (o detalhe deixa de existir) — a lista abrirá com a pesquisa restaurada pelo item 1.
- Após **salvar** no formulário, manter o comportamento atual (ir ao detalhe/lista); o estado restaurado cobre a volta seguinte.

### Resultado para o usuário
Filtrou, buscou, abriu um imóvel, clicou em Voltar → a lista reaparece com a mesma busca, mesmos filtros, mesma página. Se abriu o imóvel vindo de outra tela (ex.: ficha de um lead), Voltar retorna para essa tela.

## Detalhes técnicos
- Apenas frontend; nenhuma mudança no banco.
- `sessionStorage` persiste enquanto a aba estiver aberta; fechar a aba reseta a pesquisa (comportamento esperado).
- `Link` dos cards de imóvel não precisa mudar — a restauração vem do estado salvo, não da URL.
