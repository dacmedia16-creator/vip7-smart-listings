# Seleção múltipla para ativar/desativar imóveis no CRM

Na lista de imóveis do CRM, permitir selecionar vários imóveis de uma vez e aplicar "Ativar" ou "Desativar" em lote.

## O que será feito

1. **Seleção nos cards (`src/crm/pages/Imoveis.tsx`)**
   - Checkbox no canto de cada card (não interfere no clique que abre o detalhe).
   - Checkbox "Selecionar todos" no topo da lista (seleciona apenas os imóveis da página atual visível).

2. **Barra de ações em lote**
   - Aparece quando há 1+ imóveis selecionados: mostra a contagem ("5 selecionados") e os botões:
     - **Ativar selecionados** → `ativo=true`, `status='disponivel'`
     - **Desativar selecionados** → `ativo=false`, `status='inativo'` (com dialog de confirmação: "Desativar N imóveis? Eles deixarão de aparecer no site.")
     - **Limpar seleção**
   - Botões respeitam a mesma permissão do menu atual (admin/gestor ou corretor dono do imóvel).

3. **Execução**
   - Um único update no banco filtrando por `id in (...)` — rápido mesmo com dezenas de imóveis.
   - Toast de resultado ("12 imóveis desativados") e lista atualizada no lugar, mantendo busca, filtros e página.
   - Seleção é limpa ao mudar de página/filtros para evitar ações acidentais em itens fora da tela.

## Detalhes técnicos

- Reaproveita a mesma regra já existente no menu de três pontinhos: desativar → `{ ativo: false, status: 'inativo' }`; ativar → `{ ativo: true, status: 'disponivel' }`.
- Update único em `imoveis_proprios` com `.in('id', ids)`; invalidação da query da lista.
- Nenhuma migration ou mudança de banco necessária.

## Validação

- Build OK.
- Verificar: selecionar vários cards, desativar em lote, badges mudam para "Desativado", imóveis saem do site público; reativar em lote funciona da mesma forma.
