## Objetivo
Validar o CRUD de **Imóveis Próprios** ponta a ponta e garantir que as permissões por role (admin, gestor, corretor, atendente) funcionem tanto na UI quanto no banco.

## Lacunas detectadas na implementação atual
1. **UI não respeita roles.** Todo usuário logado vê "Novo Imóvel", botão "Excluir" e consegue clicar em editar — quem não tem permissão só recebe erro do RLS ao salvar.
2. **Corretor não consegue criar imóvel.** O form não preenche `corretor_id = auth.uid()` no insert; a policy `imoveis_corretor_write_own` exige isso → insert do corretor falha silenciosamente.
3. **Atendente não tem policy de leitura.** Hoje só admin/gestor/corretor leem (corretor só os próprios). Definir se atendente deve ver imóveis ou não.
4. **Não existe página de Detalhes** — só listagem e form de edição. Falta uma visão read-only com fotos, mapa, dados completos.
5. **Sem testes manuais documentados.** Precisa de um checklist por role para validar.

## Plano de validação e ajustes

### 1. Matriz de permissões (a confirmar com você)

| Ação                          | Admin | Gestor | Corretor             | Atendente |
| ----------------------------- | ----- | ------ | -------------------- | --------- |
| Listar todos                  | ✅    | ✅     | ✅ (todos do CRM)    | ❓        |
| Ver detalhes                  | ✅    | ✅     | ✅                   | ❓        |
| Criar                         | ✅    | ✅     | ✅ (vira dono)       | ❌        |
| Editar qualquer imóvel        | ✅    | ✅     | ❌                   | ❌        |
| Editar os próprios            | —     | —      | ✅                   | ❌        |
| Excluir                       | ✅    | ✅     | ✅ (só os próprios?) | ❌        |

### 2. Ajustes de código

**`src/crm/pages/Imoveis.tsx`**
- Esconder botão "Novo Imóvel" se o usuário não puder criar (atendente).
- Mostrar badge "Meu" nos cards do corretor logado.
- Card clica em `/crm/imoveis/:id` (detalhes), não direto no editar.

**`src/crm/pages/ImovelDetail.tsx` (novo)**
- Página read-only: galeria de fotos, dados, preço, localização, status, corretor responsável.
- Botão "Editar" só aparece para quem pode editar aquele registro.
- Botão "Excluir" só para admin/gestor (e corretor dono, se aprovado).

**`src/crm/pages/ImovelForm.tsx`**
- Ao criar como corretor, setar `corretor_id = user.id` automaticamente.
- Admin/gestor: dropdown "Corretor responsável" (opcional) listando profiles com role corretor.
- Bloquear acesso ao form para atendente (redirect).
- Esconder "Excluir" quando o usuário não tem permissão.

**`src/App.tsx`**
- Adicionar rota `/crm/imoveis/:id` → `ImovelDetail`.
- Usar `<RequireAuth roles={['admin','gestor','corretor']}>` para `/novo` e `/editar`.

### 3. RLS (se a matriz mudar)
Migração só se você quiser permitir atendente ler imóveis, ou restringir delete do corretor aos próprios. Caso contrário, as policies atuais já cobrem.

### 4. Checklist de teste manual (a executar após os ajustes)
Para cada role (admin, gestor, corretor, atendente), logar e validar:
- [ ] `/crm/imoveis` carrega lista esperada (sem erro de RLS no console)
- [ ] Botão "Novo Imóvel" aparece/some conforme matriz
- [ ] Criar imóvel: salva, aparece na lista, fotos exibem
- [ ] Abrir detalhes: dados corretos, botões certos
- [ ] Editar imóvel próprio: salva
- [ ] Editar imóvel de outro corretor: bloqueado/sem botão
- [ ] Excluir: confirmação + remove + redireciona
- [ ] Atendente em `/crm/imoveis/novo` é redirecionado

### 5. Entregáveis
1. Página `ImovelDetail.tsx` (nova)
2. Ajustes em `Imoveis.tsx`, `ImovelForm.tsx`, `App.tsx`
3. Migração RLS opcional (só se a matriz acima mudar)
4. Resultado do checklist documentado nesta conversa

## Perguntas antes de implementar
1. **Atendente** pode visualizar imóveis (read-only) ou não tem acesso à seção?
2. **Corretor** pode excluir só os próprios imóveis, ou excluir é restrito a admin/gestor?
3. **Admin/gestor** ao criar um imóvel: querem escolher o corretor responsável no form, ou deixa em branco e atribui depois?
