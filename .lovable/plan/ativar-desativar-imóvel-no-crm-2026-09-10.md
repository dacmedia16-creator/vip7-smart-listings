# Ativar/Desativar imóvel no CRM

Hoje já existe a ação "Desativar (ocultar do site)" dentro do formulário de edição do imóvel (`ImovelForm.tsx`), que alterna `ativo` + `status` (`inativo` ↔ `disponivel`). O objetivo é expor essa mesma opção diretamente, sem precisar entrar na edição.

## O que será feito

1. **Lista de imóveis (`src/crm/pages/Imoveis.tsx`)**
   - Adicionar menu de ações (ícone de três pontinhos) em cada card, com a opção:
     - **Desativar imóvel** quando estiver ativo (define `ativo=false`, `status='inativo'`)
     - **Reativar imóvel** quando estiver inativo (define `ativo=true`, `status='disponivel'`)
   - Confirmação antes de executar (dialog "Desativar este imóvel? Ele deixará de aparecer no site principal.")
   - Toast de sucesso ("Imóvel desativado" / "Imóvel reativado") e atualização da lista sem recarregar filtros/busca.

2. **Página de detalhes (`src/crm/pages/ImovelDetail.tsx`)**
   - Adicionar botão no cabeçalho, ao lado de Editar/Excluir: **Desativar** (ou **Reativar** quando inativo), com o mesmo dialog de confirmação e toast.
   - Após desativar/reativar, a página reflete o novo estado (badge "Desativado" já existente na lista).

## Detalhes técnicos

- Reaproveita a mesma regra do formulário: desativar → `{ ativo: false, status: 'inativo' }`; reativar → `{ ativo: true, status: 'disponivel' }`.
- Update direto em `imoveis_proprios` via Supabase (RLS já permite update para usuários do CRM).
- Invalidar a query da lista (`['crm','imoveis']`) para refletir a mudança mantendo busca/filtros/página.
- Nenhuma migration ou mudança de banco necessária.

## Validação

- Build OK.
- Verificar: card muda o badge para "Desativado", filtro "Apenas inativos" passa a listar o imóvel, e o imóvel some do site público.
