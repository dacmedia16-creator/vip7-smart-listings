# Código automático ao cadastrar imóvel

## Situação atual

O sistema já gera o código sozinho no momento de salvar: todo imóvel novo criado à mão recebe o próximo número da sequência (VIP0001, VIP0002, ...). O problema é que isso é invisível: a tela de cadastro mostra o campo "Código interno" vazio e editável, então parece que nada foi gerado, e alguém pode digitar um código repetido ou errado por cima.

## O que vou fazer

1. Na tela de novo imóvel, o campo "Código interno" passa a ser somente leitura, mostrando "Gerado automaticamente ao salvar".
2. Ao salvar, o código criado aparece na mensagem de confirmação ("Imóvel VIP0042 criado").
3. Na tela de edição, o campo mostra o código já existente, também somente leitura (evita quebrar a numeração). Imóveis vindos do Imoview continuam exibindo o código deles.
4. Garantia contra duplicidade: impedir dois imóveis com o mesmo código interno.

## Detalhes técnicos

- `src/crm/pages/ImovelForm.tsx`: renderizar `codigo_interno` com input desabilitado/readonly (placeholder no modo criação, valor no modo edição) e não enviar o campo no insert, deixando o gatilho do banco preencher.
- Após o insert, usar `.select('codigo_interno').single()` para exibir o código no toast.
- Migração: índice único parcial em `imoveis_proprios(codigo_interno)` quando não nulo.
- A função `next_codigo_interno_vip()` e o gatilho `trg_set_codigo_interno_vip` já existem e permanecem como estão.
