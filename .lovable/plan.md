# Melhorar contraste na tabela de imóveis do condomínio

Na página `/crm/condominios/:codigo` as colunas "Finalidade", "Quartos/Suítes/Vagas", "Área" e "Preço" ficam quase invisíveis (texto cinza muito claro herdado do token padrão da tabela).

## Mudanças em `src/crm/pages/CondominioDetail.tsx`

- `TableCell` de Finalidade: `text-[#2A2A30] capitalize text-sm font-medium`
- `TableCell` de Quartos/Suítes/Vagas: `text-[#2A2A30] text-sm font-medium`
- `TableCell` de Área: `text-[#2A2A30] text-sm font-medium`
- `TableCell` de Preço: `text-right font-semibold text-[#0F0F12]`
- Badge de status: usar paleta dourada do CRM com bom contraste — `bg-emerald-100 text-emerald-800 border border-emerald-200` para `Disponível`; manter `imovelStatusMeta` mas adicionar borda nos badges (`border` + classes do meta) para destacar.
- Adicionar zebra leve nas linhas: `even:bg-[#FBFAF5]` no `TableRow`.

Sem mudanças em funcionalidade — apenas cores.
