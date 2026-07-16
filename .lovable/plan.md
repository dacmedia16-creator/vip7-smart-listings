# Aceitar código alfanumérico na busca por código

Hoje a busca só aceita dígitos (`codigo_imoview`). Códigos internos como `VIP0001` são rejeitados.

## Mudanças

1. **`src/components/HeroSection.tsx`** (input de busca por código, linha ~421)
   - Remover `inputMode="numeric"` e o filtro `replace(/\D/g,'')`.
   - Aceitar qualquer caractere, transformando em maiúsculas.
   - Atualizar `placeholder` para `Ex: 2138 ou VIP0001`.
   - `handleSearchByCodigo` envia o valor bruto (trim + upper).

2. **`src/services/imoveisDb.ts` → `detalhesImovel`**
   - Se for número → busca por `codigo_imoview` (mantém).
   - Se for UUID → busca por `id` (mantém).
   - **Novo fallback**: se for string alfanumérica → busca por `codigo_interno` com `ilike` (case-insensitive).

Nada mais é alterado — resto do fluxo (rota `/imovel/:codigo`, cards) já passa string.
