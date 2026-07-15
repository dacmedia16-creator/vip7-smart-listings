## Problema

Ao clicar em **"Finalizar e salvar"** no cadastro de imóvel, nada acontece — sem toast, sem redirecionamento.

Causa: o formulário usa `react-hook-form` + `zod` com campos obrigatórios (`titulo` ≥ 3, `tipo`, `finalidade`, `status`, `preco` > 0). Se algum estiver inválido, `handleSubmit` bloqueia o envio silenciosamente. Como o form é dividido em abas, o campo com erro pode estar numa aba que o usuário não vê, então parece que o botão "não faz nada".

## Correção

Em `src/crm/pages/ImovelForm.tsx`:

1. Passar um handler `onInvalid` para `form.handleSubmit(onSubmit, onInvalid)`.
2. Em `onInvalid`, exibir um toast destrutivo listando os campos com erro (ex.: "Título, Preço") e **navegar automaticamente para a primeira aba** que contém o campo inválido, para o usuário ver o destaque de erro.
3. Mapear cada campo do schema à sua aba (`TABS`) para saber para onde levar.

Nenhuma outra lógica de salvar é alterada — o `onSubmit` existente já grava corretamente quando os dados são válidos.

## Verificação

- Clicar em "Finalizar e salvar" com campos vazios → toast lista os campos faltantes e abre a aba correta.
- Preencher tudo e clicar novamente → salva e redireciona para `/crm/imoveis` como antes.
