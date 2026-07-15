## Problema
O último imóvel cadastrado manualmente (origem `proprio`) ficou sem código porque o campo `codigo_interno` do formulário é opcional — só é preenchido se o usuário digitar. Como os imóveis do Imoview têm `codigo_imoview`, só os cadastrados manualmente aparecem com "—" na lista do CRM.

## Solução proposta
Gerar automaticamente um `codigo_interno` para imóveis próprios no momento do salvamento (quando o usuário não digitar um código manualmente).

### Formato do código
Prefixo `VIP` + número sequencial de 4 dígitos, começando do maior atualmente em uso. Ex.: `VIP0001`, `VIP0002`, …

Vantagens:
- Fácil de ler e falar por telefone/WhatsApp.
- Não conflita com códigos numéricos do Imoview (que são apenas números).
- Sequencial → fácil identificar imóveis mais recentes.

### Onde implementar
1. **Função no banco** `next_codigo_interno_vip()` — SECURITY DEFINER, faz `SELECT max(...)` sobre `codigo_interno` que casa com `^VIP\d+$` e retorna o próximo (`VIP` + N+1 com padding). Uso de advisory lock para evitar race condition em cadastros simultâneos.
2. **`ImovelForm.tsx` (onSubmit)** — se `origem === 'proprio'` (ou novo cadastro) e `codigo_interno` estiver vazio, chamar `supabase.rpc('next_codigo_interno_vip')` e injetar no payload antes do insert.
3. **Backfill** — atualizar o único imóvel já cadastrado sem código (id `ab7ff74d…`) para receber `VIP0001`.

### O que NÃO muda
- Imóveis vindos do Imoview continuam usando `codigo_imoview` como identificador principal (nada é sobrescrito).
- Usuário ainda pode digitar um `codigo_interno` manual — a geração só ocorre quando o campo está vazio.
- Nenhuma alteração no site público / API / edge functions.

## Checagem
Após implementar: cadastrar um novo imóvel próprio de teste sem preencher código e confirmar que ele aparece na lista com `VIP0002`.