## Situação

Você não encontrou a opção "Allow public buckets" em Privacy & Security — e faz sentido: a tela que você mostrou é de **Workspace → Privacy & security** (acessos e convites), não é lá que fica esse controle. Além disso, o workspace tem a policy `cloud_block_public_buckets` ativa, o que faz o tool `storage_update_bucket` recusar tornar o bucket público.

Como tornar o bucket público **não é viável** agora, vou por outro caminho que resolve o problema sem depender dessa configuração.

## Correção (sem precisar liberar bucket público)

Trocar `getPublicUrl` por **`createSignedUrl`** no formulário de fotos. Assim o bucket permanece **privado** e as miniaturas continuam funcionando — o Storage gera uma URL assinada temporária que qualquer usuário autenticado do CRM consegue abrir.

### Passos

1. **`src/crm/pages/ImovelForm.tsx`**
   - No upload de fotos (~linha 411): depois do `upload(...)`, chamar `supabase.storage.from('imoveis-fotos').createSignedUrl(path, 60 * 60 * 24 * 7)` (7 dias) e salvar essa URL no state em vez de `getPublicUrl`.
   - Ao **abrir** um imóvel existente para editar, gerar signed URLs em lote para as fotos já salvas (usando `createSignedUrls`) para os thumbnails renderizarem.
   - Manter as melhorias de robustez já planejadas: sanitizar extensão (`jpg`/`jpeg`/`png`/`webp`), passar `contentType`, `upsert: false`, toast por arquivo com erro sem abortar os demais, log de `error.message`.

2. **O que fica salvo no banco**: continua sendo o **path** do arquivo no bucket (ex.: `imovel-123/uuid.jpg`), **não** a URL assinada (que expira). Isso já é como o restante do sistema espera.

3. **`imoview-sync`**: **não mexer agora**. Ela roda no servidor e o `getPublicUrl` lá é usado para gerar link público de fotos vindas do Imoview — é um fluxo separado do upload manual e não afeta o bug que você está enfrentando. Se aparecer o mesmo problema lá depois, tratamos em um plano próprio.

## Verificação

- `/crm/imoveis/novo` → aba Fotos → Adicionar fotos: miniaturas aparecem imediatamente.
- Salvar o imóvel, sair e reabrir em edição: miniaturas continuam visíveis (signed URLs regeradas no load).
- Console sem 400/404 em requests para `/storage/v1/object/public/imoveis-fotos/...`.

## Fora do escopo

- Não tornar o bucket público (bloqueado pelo workspace).
- Não alterar RLS / migrations.
- Não refatorar reordenação/capa nem outros passos do formulário.
- Não tocar em `imoview-sync`.
