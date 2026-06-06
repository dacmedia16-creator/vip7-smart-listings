# QA — CRUD Imóveis Próprios por Role

Roteiro de validação manual do módulo `/crm/imoveis`. Marque os checkboxes
ao executar com cada usuário de teste. Em caso de divergência, abrir issue
referenciando o item para correção (UI ou política RLS).

## 0. Preparação

- [ ] Existe pelo menos 1 usuário em cada role (`admin`, `gestor`, `corretor`, `atendente`).
  - Cadastro/edição em `/crm/configuracoes` (apenas admin).
- [ ] Criar 2 imóveis-semente (logado como admin em `/crm/imoveis/novo`):
  - **IMV-A** com `corretor responsável = <corretor de teste>`.
  - **IMV-B** com `corretor responsável = nenhum` (ou outro corretor).
- [ ] Anotar credenciais de teste de cada role.

## 1. Matriz esperada de permissões

| Ação | atendente | corretor (dono) | corretor (não dono) | gestor | admin |
|---|---|---|---|---|---|
| Listar imóveis | ✅ read-only | ✅ | ✅ | ✅ | ✅ |
| Ver detalhe `/crm/imoveis/:id` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Botão "Novo Imóvel" visível | ❌ | ✅ | ✅ | ✅ | ✅ |
| Criar imóvel | ❌ rota bloqueada | ✅ (`corretor_id = self`) | ✅ (`corretor_id = self`) | ✅ | ✅ |
| Editar IMV-A | ❌ | ✅ | ❌ | ✅ | ✅ |
| Excluir IMV-A | ❌ | ✅ | ❌ | ✅ | ✅ |
| Alterar "Corretor responsável" | ❌ | ❌ (campo oculto) | ❌ | ✅ | ✅ |

## 2. Checklist por role

### 2.1 atendente
- [ ] Lista `/crm/imoveis` carrega sem erros no console.
- [ ] Botão **"Novo Imóvel"** não aparece.
- [ ] Acesso direto a `/crm/imoveis/novo` redireciona para `/crm/sem-acesso` (ou login).
- [ ] Detalhe `/crm/imoveis/:id` abre, **sem** botões "Editar" e "Excluir".
- [ ] Acesso direto a `/crm/imoveis/:id/editar` é bloqueado.

### 2.2 corretor
- [ ] Lista mostra badge **"Meu"** apenas em IMV-A.
- [ ] Cria novo imóvel (IMV-C). Após salvar, abrir detalhe e confirmar visualmente que ele é dono.
- [ ] Validar no banco: `corretor_id` do IMV-C = uid do corretor logado.
- [ ] Edita IMV-A com sucesso; campo "Corretor responsável" **não** aparece no formulário.
- [ ] Tenta abrir `/crm/imoveis/<IMV-B>/editar` → bloqueado (UI sem botão; URL direta retorna erro/redirect).
- [ ] Exclui IMV-C (próprio). Some da listagem.
- [ ] Tenta excluir IMV-B → ação indisponível.

### 2.3 gestor
- [ ] Edita IMV-A e IMV-B com sucesso.
- [ ] Em IMV-B, altera "Corretor responsável" para outro corretor; recarrega e confirma que persistiu.
- [ ] Exclui um imóvel descartável.

### 2.4 admin
- [ ] Repete todos os itens do gestor.
- [ ] Confirma em `activity_log` que ações `criou`/`editou`/`removeu` foram registradas com o `user_id` correto.

## 3. Verificações no banco

```sql
-- Últimos imóveis tocados (cheque corretor_id após cada bloco)
SELECT id, titulo, corretor_id, status, updated_at
FROM imoveis_proprios
ORDER BY updated_at DESC
LIMIT 10;

-- Trilha de auditoria
SELECT entidade, acao, user_id, created_at
FROM activity_log
WHERE entidade = 'imoveis_proprios'
ORDER BY created_at DESC
LIMIT 20;
```

## 4. Critérios de aceite

- Todos os itens da seção 2 marcados conforme a matriz da seção 1.
- Sem erros de RLS no console em fluxos permitidos.
- `activity_log` registra criar/editar/excluir com o `user_id` correto.

## 5. Referências de implementação

- Políticas em `imoveis_proprios`:
  - `imoveis_admin_write` — ALL para admin/gestor.
  - `imoveis_corretor_write_own` — ALL para corretor com `corretor_id = auth.uid()`.
  - `imoveis_crm_read_all` — SELECT para qualquer usuário do CRM (cobre atendente).
  - `imoveis_public_read` — SELECT público para imóveis ativos.
- UI: `src/crm/pages/Imoveis.tsx`, `ImovelForm.tsx`, `ImovelDetail.tsx`.
- Rotas protegidas: `src/App.tsx` (`RequireAuth roles={['admin','gestor','corretor']}` em `/novo` e `/editar`).
