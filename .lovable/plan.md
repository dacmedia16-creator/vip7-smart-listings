# Corrigir "tipo de imóvel obrigatório" — 61 anúncios rejeitados no Zap

## Diagnóstico

Os 61 anúncios rejeitados pelo Zap/VivaReal são todos do tipo **Casa de Condomínio** (57) ou **Lote em condomínio** (1), todos à venda.

O arquivo enviado aos portais traduz esses tipos para valores que **não existem no vocabulário oficial** do Zap/VivaReal:
- "Casa de Condomínio" → `Residential / Condominium House` (valor inválido — o correto é `Residential / Condo`)
- "Lote em condomínio" → `Allotment Land` (valor inválido sozinho — o correto é `Residential / Land`)

Como o valor enviado não é reconhecido, o portal entende que o campo "tipo de imóvel" está vazio e rejeita o anúncio com "O campo tipo de imóvel é obrigatório".

## Correção

1. No tradutor do arquivo de portais, corrigir os valores:
   - Casa de Condomínio / Casa em Condomínio → `Residential / Condo`
   - Terreno/Lote → `Residential / Land`
2. Conferir os demais valores traduzidos contra a lista oficial do Zap/VivaReal e ajustar qualquer outro inválido (ex.: validar `Residential / Country House`, `Commercial / Business` etc.).
3. Republicar e verificar.

## Detalhes técnicos

- `supabase/functions/portal-feed/vrsync-maps.ts`: ajustar `mapPropertyType` para usar apenas valores do vocabulário oficial VRSync.
- Sem mudanças no banco nem no site.

## Verificação

- Baixar o feed do Zap e confirmar que os 61 imóveis saem com `<PropertyType>` válido (ex.: código 3899 → `Residential / Condo`).
- Conferir que o total de anúncios do feed se mantém e que nenhum imóvel sai com tipo vazio.
