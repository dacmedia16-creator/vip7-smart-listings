# Plano: Validação do CRUD de Imóveis Próprios por Role

Objetivo: confirmar que `atendente`, `corretor`, `gestor` e `admin` enxergam e executam apenas as ações permitidas em `/crm/imoveis`, incluindo a atribuição de corretor responsável.

## 1. Preparação do ambiente de teste

1. Garantir que existe pelo menos 1 usuário em cada role no `user_roles`. Caso falte algum, criar via `/crm/configuracoes` (admin) ou via insert direto no banco.
2. Criar (como admin) 2 imóveis-semente:
   - **IMV-A**: `corretor_id = <corretor de teste>`
   - **IMV-B**: `corretor_id = NULL` (ou outro corretor)
3. Anotar e-mails/senhas de teste de cada role para alternar logins rapidamente.

## 2. Matriz esperada de permissões

| Ação | atendente | corretor (dono) | corretor (não dono) | gestor | admin |
|---|---|---|---|---|---|
| Listar imóveis | sim (read-only) | sim | sim | sim | sim |
| Ver detalhe `/crm/imoveis/:id` | sim | sim | sim | sim | sim |
| Botão "Novo Imóvel" visível | não | sim | sim | sim | sim |
| Criar imóvel | não (rota bloqueada) | sim (corretor_id = self) | sim (corretor_id = self) | sim | sim |
| Editar IMV-A | não | sim | não | sim | sim |
| Excluir IMV-A | não | sim | não | sim | sim |
| Alterar "Corretor responsável" | não | não (campo oculto) | não | sim | sim |

## 3. Checklist manual por role

Para cada role, login → `/crm/imoveis` e validar:

### atendente
- [ ] Lista carrega sem erro.
- [ ] Botão "Novo Imóvel" **não** aparece.
- [ ] Acesso direto a `/crm/imoveis/novo` redireciona/bloqueia.
- [ ] Detalhe abre, mas sem botões "Editar"/"Excluir".

### corretor
- [ ] Lista mostra badge "Meu" apenas em IMV-A.
- [ ] Cria novo imóvel; após salvar, `corretor_id` = próprio uid (validar no detalhe e via `supabase--read_query`).
- [ ] Edita IMV-A com sucesso; campo "Corretor responsável" oculto.
- [ ] Tenta editar IMV-B → bloqueado (UI sem botão e/ou erro RLS se forçar URL).
- [ ] Exclui imóvel próprio recém-criado.

### gestor
- [ ] Edita IMV-A e IMV-B.
- [ ] Reatribui "Corretor responsável" de IMV-B para outro corretor; persiste após reload.
- [ ] Exclui qualquer imóvel.

### admin
- [ ] Mesmas validações de gestor.
- [ ] Confirma em `activity_log` que ações de criar/editar/excluir foram registradas.

## 4. Verificações no banco (via supabase--read_query)

- `SELECT id, titulo, corretor_id FROM imoveis_proprios ORDER BY updated_at DESC LIMIT 10;` após cada bloco.
- `SELECT entidade, acao, user_id, created_at FROM activity_log WHERE entidade='imoveis_proprios' ORDER BY created_at DESC LIMIT 20;` para auditoria.

## 5. Como executarei os testes

Existem duas formas — escolha qual prefere antes de aprovar o plano:

- **A. Eu testo pelo browser tool**: preciso que você me passe credenciais de teste (ou crie usuários descartáveis) para cada role. Faço o roteiro acima e devolvo um relatório com prints/observações.
- **B. Você testa manualmente**: eu entrego este checklist como `docs/qa/imoveis-rbac.md` no projeto e fico de plantão para corrigir qualquer divergência que aparecer.

## 6. Critérios de aceite

- Todos os itens da seção 3 marcados conforme a matriz da seção 2.
- Nenhum erro de RLS no console durante fluxos permitidos.
- `activity_log` registra criar/editar/excluir do role correto.
- Caso algum item falhe, abro correção pontual (UI ou política RLS) antes de fechar a entrega.

## Detalhes técnicos relevantes

- Políticas atuais em `imoveis_proprios`:
  - `imoveis_admin_write` (ALL para admin/gestor)
  - `imoveis_corretor_write_own` (ALL para corretor quando `corretor_id = auth.uid()`)
  - `imoveis_crm_read_all` (SELECT para qualquer usuário do CRM, cobre atendente)
  - `imoveis_public_read` (SELECT público para ativos)
- UI já implementada em `Imoveis.tsx`, `ImovelForm.tsx`, `ImovelDetail.tsx`, com `RequireAuth roles={['admin','gestor','corretor']}` nas rotas `/novo` e `/editar` (App.tsx).
- Nenhuma mudança de schema é prevista; só serão criadas migrações se algum teste revelar gap real (ex.: permitir corretor excluir somente próprios via política DELETE separada).
