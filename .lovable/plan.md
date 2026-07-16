## Adicionar link público do imóvel na página do CRM

Em `src/crm/pages/ImovelDetail.tsx`, adicionar um card lateral "Link do site" mostrando a URL pública do imóvel. Ao clicar no link, ele é copiado para a área de transferência (com toast de confirmação) e também há um botão para abrir a página pública em nova aba.

### O que muda

**Arquivo:** `src/crm/pages/ImovelDetail.tsx`

1. Importar helper `uuidToCode` de `@/services/imoveisDb` (ou replicar cálculo) e `Copy`, `ExternalLink` de `lucide-react`.
2. Calcular `codigoPublico = imovel.codigo_imoview ?? uuidToCode(imovel.id)` — mesma regra usada em `imoveisDb.ts` para mapear registros do CRM ao site público.
3. Montar `linkPublico = ${window.location.origin}/#/imovel/${codigoPublico}` (rota `/imovel/:codigo` definida em `App.tsx`).
4. Novo `<Card>` na coluna lateral (após "Valores" ou antes de "Pessoas vinculadas"):
   - Título: "Link do site"
   - Texto do link exibido em fonte mono, truncado, com `cursor: pointer`
   - Ao clicar: `navigator.clipboard.writeText(linkPublico)` + `toast({ title: 'Link copiado!' })`
   - Botão secundário `<a target="_blank" rel="noopener">` com ícone `ExternalLink` para abrir a página pública

### Detalhes técnicos

- Reaproveita o helper `uuidToCode` já existente em `src/services/imoveisDb.ts` (linha ~88) para garantir consistência com a resolução do site público.
- Usa `#/` no path para funcionar mesmo em ambientes sem SPA rewrite (mesmo padrão de `buildOgShareUrl` em `src/lib/formatters.ts`).
- Fallback caso `clipboard` não esteja disponível: mostrar toast de erro.
- Nada muda em outros arquivos, back-end ou schema.
