# Separar proprietários e interessados no card "Pessoas vinculadas"

## Mudança em `src/crm/components/PessoasVinculadasCard.tsx`

Agrupar `rows` por `papel` em duas seções renderizadas na ordem:

1. **Proprietários** (papel `proprietario`) — com contador ao lado do título.
2. **Interessados** (papel `interessado`).
3. **Outros** (co-proprietário, procurador, inquilino etc., se existirem) numa seção "Outros".

Cada seção com um subtítulo pequeno (`text-xs uppercase tracking-wide text-muted-foreground`) e o mesmo layout de linha já existente. Seções vazias são ocultadas. Botão "Adicionar interessado" continua no rodapé.
