## Objetivo
Fazer a IA gerar também o **Título para anúncio** junto com Descrição e Meta description, no mesmo botão "✨ Gerar descrição com IA" da aba final.

## Mudanças

### 1. Edge function `supabase/functions/gerar-descricao-imovel/index.ts`
- Atualizar o prompt do system para pedir um terceiro campo `titulo`:
  - Curto (até 80 caracteres), comercial, sem emojis, sem preço, destacando tipo + bairro + diferencial principal (ex.: "Casa térrea com piscina no Alphaville Nova Esplanada").
- Atualizar o JSON retornado: `{ titulo, descricao, meta_description }`.

### 2. Front `src/crm/pages/ImovelForm.tsx`
- No handler `gerarDescricaoIA`, após receber a resposta, fazer também:
  - `form.setValue('titulo_anuncio', d.titulo, { shouldDirty: true })` quando vier.
- Ajustar o texto do botão para "✨ Gerar título + descrição com IA" e o helper acima para refletir que título também é gerado.

Sem mudança em schema, RLS ou outras telas.
