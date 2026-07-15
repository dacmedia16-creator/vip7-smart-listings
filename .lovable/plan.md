## Problema

As fotos foram carregadas com sucesso (o upload salva no bucket `imoveis-fotos` e grava um **path** puro, ex.: `abc-123.jpg`, na coluna `fotos` do imóvel).

Mas o site público mostra imagem quebrada porque em `src/services/imoveisDb.ts` (linha 169) esses paths são passados direto como `url`:

```ts
fotos: (r.fotos ?? []).map((url) => ({ url })),
```

Como o `<img src="abc-123.jpg">` é uma referência relativa, o navegador tenta buscar `https://vipsevenimoveis.com.br/abc-123.jpg` — que não existe. Por isso as fotos "não aparecem".

## Correção

Em `src/services/imoveisDb.ts`, transformar cada valor de `fotos` em uma URL pública válida do bucket `imoveis-fotos` (que já está público):

1. Criar helper `toPublicPhotoUrl(value)`:
   - Se já for `http(s)://…` → retornar como está (compatibilidade com fotos antigas importadas do Imoview).
   - Caso contrário, tratar como path do bucket e retornar `supabase.storage.from('imoveis-fotos').getPublicUrl(path).data.publicUrl`.
2. Substituir a linha 169 por:
   ```ts
   fotos: (r.fotos ?? []).map((v) => ({ url: toPublicPhotoUrl(v) })),
   ```

Nada mais muda. O CRM continua funcionando (ele já gera signed URLs para preview interno).

## Verificação

- Abrir o imóvel recém-cadastrado no site (`/imovel/:codigo`) → galeria carrega as fotos.
- Card na listagem `/imoveis` também mostra a primeira foto.
- Imóveis antigos (com URL completa) continuam funcionando.
