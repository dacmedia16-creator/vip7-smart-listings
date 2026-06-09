## Problema
Hoje o `lookupCep()` em `ImovelForm.tsx` só preenche `endereco`, `bairro`, `cidade` e `estado` se o campo estiver vazio. Quando o usuário digita um CEP novo após já ter algo preenchido (ex.: corrigindo um endereço errado), nada é atualizado.

## Mudança
Em `src/crm/pages/ImovelForm.tsx`, na função `lookupCep`:

- Remover as checagens `if (!form.getValues('endereco'))`, `if (!form.getValues('bairro'))`, etc.
- Sempre sobrescrever `endereco` (logradouro), `bairro`, `cidade` (localidade) e `estado` (uf) com o retorno da API, usando `shouldDirty: true`.
- Manter o foco automático no campo `numero` após preencher.
- Manter o `lastCepRef` para não refazer a mesma busca enquanto o CEP não muda.

Sem alterações em backend, schema ou outras abas.
