# Tipo de anúncio por portal (estilo Imoview / Grupo Zap)

Hoje cada portal tem só um toggle "publicar" e um "destaque_portal" booleano. O Imoview oferece níveis de destaque (Simples, Destaque, Super Destaque, Triple, Premiere Premium, Premiere Especial). Vamos substituir o booleano de destaque por um campo enum `tipo_anuncio`, aplicável a todos os portais — começando pelo Grupo Zap (Zap+VivaReal e OLX), que é onde esses níveis fazem sentido real, mas disponível também para os outros.

## Mudanças

### 1. Banco (migração)
- Criar enum `tipo_anuncio_portal` com valores: `simples`, `destaque`, `super_destaque`, `triple`, `premiere_premium`, `premiere_especial`.
- Adicionar coluna `tipo_anuncio tipo_anuncio_portal NOT NULL DEFAULT 'simples'` em `imovel_portais`.
- Manter `destaque_portal` por compatibilidade (passa a ser derivado: true quando `tipo_anuncio != 'simples'`) — atualizar valores existentes onde `destaque_portal = true` → `tipo_anuncio = 'destaque'`.

### 2. `src/crm/lib/portais.ts`
- Exportar `TIPOS_ANUNCIO`: `[{id, label, descricao}]` com os 6 níveis.
- Tipar `Row.tipo_anuncio`.

### 3. `src/crm/components/PortaisCard.tsx` (formulário do imóvel)
- Para cada portal ativo (toggle publicar = on), trocar o switch "Destaque no portal" por um **Select** "Tipo de anúncio" com as 6 opções.
- Salvar `tipo_anuncio` no upsert (mantém `destaque_portal` sincronizado para não quebrar feed).

### 4. `src/crm/pages/Portais.tsx` (listagem em tabela)
- Em cada célula de portal, além do checkbox "publicar", mostrar um pequeno select inline de tipo (apenas quando publicar=true). Opcional: ocultar em telas pequenas e manter só na tela do imóvel.

### 5. Feed XML (`supabase/functions/portal-feed/`)
- Mapear `tipo_anuncio` → tag VRSync `<ListingType>` (`PREMIUM_1`, `PREMIUM_2`, `SUPER_PREMIUM`, `TRIPLE`, etc.) conforme o portal aceitar. Para portais que não suportam, ignorar (sai como STANDARD).

## Escopo visual
Só formulário e tabela de portais — sem mudar cards de listagem de imóveis.

Confirma que posso aplicar?
