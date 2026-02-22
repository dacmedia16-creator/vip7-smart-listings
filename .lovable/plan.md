

## Adicionar frase "Somos os irmãos que mais vendem imóveis na Região"

### Alteração

**Arquivo: `src/pages/Avaliacao.tsx` (linha ~237-241)**

Adicionar uma nova linha de texto abaixo do parágrafo de descrição existente no hero section, seguindo o mesmo padrão visual (font-display, font-semibold, com a palavra "Região" destacada em dourado/primary).

O texto ficará assim na hierarquia:
1. Badge "ESTIMATIVA INSTANTÂNEA COM IA" (já existe)
2. Título "Descubra o Valor Real do Seu Imóvel" (já existe)
3. Parágrafo descritivo sobre a IA (já existe)
4. **NOVO:** "Somos os irmãos que mais vendem imóveis na Região" -- com "Região" em destaque dourado, usando `text-xl md:text-2xl font-display font-semibold`

### Detalhes Técnicos

- Adicionar `mb-6` ao parágrafo existente para espaçamento
- Nova tag `<p>` com classes `text-xl md:text-2xl font-display font-semibold text-foreground`
- Palavra "Região" envolta em `<span className="text-primary">` para o destaque dourado, igual ao padrão do título

