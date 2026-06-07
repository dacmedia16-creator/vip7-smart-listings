# Corrigir cores das páginas de Condomínios

A `Card`/`Table`/`Input` do projeto usam tokens `--card`/`--input` que estão em modo escuro (tema premium do site público). Por isso a tabela ficou preta com texto invisível.

## Mudanças

**src/crm/pages/Condominios.tsx**
- Card de filtros: `className="p-4 bg-white border-[#E8E4D9]"`
- Input de busca: `className="pl-9 bg-white border-[#E8E4D9] text-[#0F0F12] placeholder:text-[#4A4A52]"`
- `SelectTrigger`: `bg-white border-[#E8E4D9] text-[#0F0F12]`
- Card da tabela: `bg-white border-[#E8E4D9]`
- `TableHeader` em fundo `bg-[#FAF8F3]` com `TableHead` em `text-[#4A4A52]`
- `TableRow` com `border-b border-[#E8E4D9]` e hover `bg-[#FAF8F3]`
- Mensagem "Carregando…/Nenhum" com `text-[#4A4A52]`

**src/crm/pages/CondominioDetail.tsx**
- Mesma estratégia: Card branca, header da tabela com fundo creme, linhas com borda clara e hover.

Sem alteração de funcionalidade — apenas paleta para casar com o restante do CRM (fundo `#FAF8F3`, cartões brancos, texto `#0F0F12`, dourado `#C9A24C`).
