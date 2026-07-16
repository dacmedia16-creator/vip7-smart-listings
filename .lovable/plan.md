# Remover a aba "Busca com IA" do Hero

## Mudanças em `src/components/HeroSection.tsx`

- Remover o toggle "IA vs Filtros" (o `<div>` inteiro em volta dos dois botões, linhas ~201–231).
- Remover a condicional `searchMode === 'ia' ? <HeroAiSearch /> : (...)` — deixar sempre os filtros.
- Remover o state `searchMode` e o import de `HeroAiSearch` e `Sparkles` (se não usados em outro lugar do arquivo).

Nada mais é alterado. O componente `HeroAiSearch` permanece no repo caso queira reativar depois.
