# Melhorar cores do CRM — Claro Premium com Gold

## Objetivo
Tornar menus e textos do CRM nítidos e legíveis, mantendo fundo claro/marfim, textos quase pretos e acentos dourados do brand (substituindo o azul atual).

## Paleta nova (escopo: apenas `.crm-scope`)
- Fundo app: `#FAF8F3` (ivory suave)
- Fundo sidebar/header/cards: `#FFFFFF`
- Texto principal: `#0F0F12` (quase preto, alta legibilidade)
- Texto secundário: `#4A4A52` (era slate-500 → escurece)
- Bordas: `#E8E4D9` (bege claro premium, era slate-200)
- Hover sutil: `#F5F0E4`
- Acento gold: `#C9A24C` (do brand)
- Item ativo: fundo `#FBF3DC` + texto `#7A5A14` + barra lateral gold
- Badge de role: gold suave em vez de azul

## Mudanças (somente UI)
1. **`src/crm/components/CrmSidebar.tsx`**
   - Substituir `bg-white`/`border-slate-200` por tokens novos.
   - Logo: caixa gold com "V7" em preto, em vez de azul.
   - Label "Menu": cor mais escura (`#6B6B72`) para sair do cinza fraco.
   - Itens: texto `#1A1A1F`, ícones na mesma cor (hoje herdam cinza fraco).
   - Ativo: fundo champagne + texto gold escuro + borda esquerda gold de 3px.
   - Hover: fundo `#F5F0E4`.
   - Footer "Sair": texto escuro, hover champagne.

2. **`src/crm/components/CrmLayout.tsx`**
   - Header `bg-white` borda `#E8E4D9`.
   - SearchButton: borda/fundo champagne, texto `#4A4A52` (mais legível que slate-500), kbd com borda gold sutil.
   - Email do usuário: `#1A1A1F`.
   - Badge de role: `bg-[#FBF3DC] text-[#7A5A14]` em vez de azul.
   - Fundo principal: `bg-[#FAF8F3]`.

3. **`src/crm/components/GlobalSearch.tsx`** (ajuste leve)
   - Trocar acentos azuis (chips ativos, contadores) por gold, mantendo o layout atual.

4. **Páginas do CRM** (`Dashboard`, `Leads`, `Imoveis`, `Funil`, `Tarefas`, `Agenda`, `Relatorios`, `Configuracoes`)
   - Varredura para trocar `text-slate-500/400` → `text-[#4A4A52]` e `bg-blue-*`/`text-blue-*` de destaque para gold equivalente, sem mexer em lógica.
   - Botões primários permanecem (shadcn `Button` default), apenas garantir contraste.

## Fora do escopo
- Não muda layout, componentes ou lógica.
- Não altera tema do site público (continua dark/gold).
- Não toca `index.css` global (mudanças ficam dentro de `.crm-scope` via classes Tailwind diretas para não impactar o site).

## Validação
Abrir `/crm`, `/crm/leads`, `/crm/imoveis` e confirmar:
- Texto dos itens do menu nítido.
- Item ativo claramente destacado em gold.
- Header e busca legíveis.
- Nenhum cinza-em-branco quase invisível.
