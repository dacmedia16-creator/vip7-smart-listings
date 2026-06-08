# Criar usuários direto pela aba Usuários

Adiciona, em **Configurações → Usuários**, um botão **"Novo usuário"** (visível só para admin) que abre um dialog pra cadastrar a pessoa já com perfil definido — sem precisar mandar o corretor se cadastrar em `/crm/login`.

## Fluxo

1. Admin clica **"Novo usuário"** no topo da lista.
2. Preenche o formulário no dialog:
   - Nome completo (obrigatório)
   - Email (obrigatório)
   - Senha (obrigatório, mín. 8 caracteres, com botão "Gerar senha forte")
   - Telefone / WhatsApp (opcional)
   - Perfil: admin · gestor · corretor · atendente · sem acesso
   - Ativo (switch, default ligado)
3. Sistema cria o usuário no auth + profile + role num passo só.
4. Toast mostra "Usuário criado" e dá a opção **Copiar credenciais** (email + senha) pra admin enviar pro corretor.
5. Lista de usuários atualiza.

## Detalhes técnicos

**Nova edge function `crm-create-user`** (necessária porque criar usuário no auth exige service role e não pode rodar do client):

- Verifica o JWT do chamador e confirma que ele tem role `admin` via `has_role(auth.uid(), 'admin')`.
- Valida payload com zod: email válido, senha ≥8, nome ≥2, role no enum permitido.
- Usa `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_meta_data: { nome, telefone } })`.
  - `email_confirm: true` pra usuário já entrar sem precisar confirmar email.
- O trigger `handle_new_user` já cria a linha em `profiles` automaticamente. A function só faz `UPDATE profiles SET telefone, ativo` e `INSERT user_roles (user_id, role)` (pulando insert se role = `sem_acesso`).
- Em caso de erro depois do `createUser`, faz rollback chamando `auth.admin.deleteUser`.
- Retorna `{ ok: true, user_id }` ou `{ ok: false, error }`.

**Frontend (`src/crm/pages/Configuracoes.tsx`)**:
- Novo componente `NovoUsuarioDialog` na mesma pasta de páginas (ou inline).
- Botão "Novo usuário" no header da aba Usuários, com `disabled={!isAdmin}`.
- Chama `supabase.functions.invoke('crm-create-user', { body: {...} })`.
- Após sucesso → fecha dialog, mostra toast com botão "Copiar credenciais", chama `loadUsers()`.

**Segurança**:
- Function valida role server-side (não confia em flag do client).
- Senha nunca é logada.
- `service_role` só dentro da edge function.

## Fora do escopo

- Envio de email de boas-vindas com as credenciais (admin copia/cola manualmente).
- Edição de email/senha de usuário existente (fica pra depois — hoje a aba já permite trocar role e ativar/desativar).
- Reset de senha pelo admin.
