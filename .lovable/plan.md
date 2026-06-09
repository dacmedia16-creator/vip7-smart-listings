## Objetivo
Na aba "Detalhes" do formulário de imóveis (`src/crm/pages/ImovelForm.tsx`), os grupos de campos atualmente são apresentados em um `<Accordion type="multiple">` vertical (um abaixo do outro). O usuário quer que esses grupos fiquem como sub-abas horizontais (lado a lado).

## Mudança
- Substituir o bloco `<Accordion type="multiple" …>` (linhas ~526–708) por um componente `<Tabs>` aninhado.
- Cada `<AccordionItem>` vira um par `<TabsTrigger>` + `<TabsContent>`.
- A lista de tabs fica horizontal (scroll em mobile, quebra suave em desktop) logo abaixo do card de título/status.
- Conteúdo de cada tab permanece exatamente o mesmo (mesmos campos, grids e componentes).

## Tabs resultantes
1. Identificação & Comercial  
2. Valores  
3. Situação do imóvel  
4. Áreas | Dimensões | Zoneamento  
5. Anúncio & SEO  
6. Cartório  
7. Características internas  
8. Características externas  
9. Lazer  

## Nada muda além disso
- Schema, validação, auto-save, fotos, relacionamentos e demais abas principais (Endereço, Relacionamentos, Anotações, Fotos) permanecem inalterados.
- Sem alterações de banco, RLS ou backend.