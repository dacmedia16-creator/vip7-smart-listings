## Problema

No `/crm/imoveis/novo` → aba **Fotos**, as fotos aparecem quebradas (thumbnails vazios) após upload. A causa é uma incompatibilidade entre o bucket e o código:

- O bucket `imoveis-fotos` está marcado como **privado**.
- O código em `src/crm/pages/ImovelForm.tsx` (linha 411) usa `getPublicUrl(...)` — URL que **só funciona em bucket público**. Em bucket privado a URL retorna 400/404 e a imagem quebra.
- As policies RLS já liberam `SELECT` para `anon` e `authenticated` (na migration `20260606235730`), então a intenção original era o bucket ser público.
- A função `imoview-sync` também depende de `getPublicUrl` e sofre do mesmo problema.

## Correção

1. **Tornar o bucket `imoveis-fotos` público** via `supabase--storage_update_bucket` (sem migration — Lovable Cloud só aceita esse caminho para alterar buckets).
   - As policies existentes já cobrem leitura pública, então nada de RLS muda.
   - Uploads continuam restritos a usuários CRM autenticados (policy `imoveis_fotos_crm_insert`).

2. **Robustecer o upload** em `src/crm/pages/ImovelForm.tsx`:
   - Sanitizar a extensão (`.jpg`/`.jpeg`/`.png`/`.webp`) para evitar `path` inválido quando o arquivo não tem extensão.
   - Passar `contentType: file.type` e `upsert: false` para o `upload(...)`.
   - Logar `error.message` no console para diagnóstico futuro.
   - Mostrar toast individual por arquivo que falhar, sem abortar os demais.

## Verificação

- Após o ajuste do bucket, recarregar `/crm/imoveis/novo` → aba Fotos → **Adicionar fotos**: as miniaturas devem renderizar imediatamente.
- Salvar o imóvel e reabrir para confirmar que as URLs persistem e continuam visíveis.

## Não faz parte deste plano

- Não vou reescrever a lógica de reordenar/capa nem mexer nos outros passos do formulário.
- Não vou mudar o esquema do banco.