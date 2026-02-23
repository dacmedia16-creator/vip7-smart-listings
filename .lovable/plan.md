
## Abrir imóvel em nova aba ao clicar

### Resumo
Adicionar `target="_blank"` ao link do card de imóvel para que, ao clicar, a página do imóvel abra em uma nova aba do navegador.

### Alteração

**Arquivo: `src/components/PropertyCard.tsx` (linha 65-68)**

- Adicionar `target="_blank"` e `rel="noopener noreferrer"` ao componente `Link` que envolve o card
- Isso faz com que o clique abra a página de detalhes do imóvel em uma nova aba, mantendo a listagem aberta na aba atual

### Detalhes Técnicos

O componente `Link` do React Router suporta `target="_blank"` nativamente. A alteração é mínima - apenas dois atributos adicionados ao link existente na linha 65 do `PropertyCard.tsx`.
