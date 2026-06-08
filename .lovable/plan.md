# Resetar o lead correto e testar de novo

## Diagnóstico
A função `ia-whatsapp-inbound` busca o lead pelo telefone `LIKE '%15981788214%'` ordenado por `created_at DESC LIMIT 1`. Existem 10+ leads com esse mesmo número; o "vencedor" é o mais recente:

- `59b803a7-f3aa-4979-b0bf-6f36b95c5b86` — "Teste Canal IA" — `ia_handoff=true` ← é esse que está bloqueando
- `54aff7e6-d735-40f8-aa88-378c3787fa04` — "Denis Fabio de Souza" — já resetei, mas o webhook nunca chega nele.

## Passos

1. **Resetar o lead `59b803a7...`** (o que o webhook realmente usa): `ia_handoff=false`, `ia_handoff_at=null`, `ia_handoff_motivo=null`, `ia_last_message_at=null`.
2. Pedir pro usuário mandar `ola` de novo no WhatsApp.
3. Verificar logs: deve aparecer 1 `payload`, 1 `phone=... msg="ola"`, **sem** `skip: lead em handoff`, e terminar com `[ia-inbound] ok lead=59b803a7...`.
4. Se a resposta da IA chegar 1x só no WhatsApp, teste OK.

## Observação para depois
Ter vários leads com o mesmo telefone vai continuar causando confusão (a IA sempre escolhe o mais novo). Em um próximo ajuste vale pensar em: (a) deduplicar leads por telefone na criação, ou (b) o webhook escolher o lead com `ia_handoff=false` mais recente em vez do absolutamente mais recente. Fora do escopo desse teste.
