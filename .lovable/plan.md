
## Problema

Formulário do site mostrava "Mensagem enviada!" mas o lead nunca chegava ao CRM quando o telefone/email já existia nos últimos 30 dias. Causa: `capturarLead()` desviava para criar uma `lead_interacao` no lead antigo, mas `lead_interacoes` só aceita INSERT de usuários autenticados — anônimo falha silenciosamente.

## Solução (opção A escolhida)

**Cada submissão do site sempre cria um lead novo.** Quando o telefone/email já existe nos últimos 30 dias, o novo lead é marcado com tag `recontato` e recebe uma observação apontando o lead anterior. Sem mais perda de contatos.

## Mudanças

### 1. `src/lib/leadCapture.ts`
- Remover o desvio para `lead_interacoes` quando há duplicata.
- **Sempre** inserir em `leads`.
- Se `find_duplicate_lead` retornar um lead anterior:
  - Adicionar tag `'recontato'` no novo lead
  - Prefixar `observacoes` com `"⚠️ Recontato (lead anterior: <id>) — "`
- Propagar erro real (sem engolir): retornar `{ ok: false, error: msg }` para o componente.

### 2. `src/pages/Contato.tsx` e demais formulários que chamam `capturarLead`
- Conferir retorno: se `ok === false`, mostrar toast de erro com a mensagem real em vez do toast genérico de sucesso.
- Se `duplicate === true`, mostrar toast de sucesso com aviso suave: "Já temos seu contato — vamos te chamar em breve."

### 3. Fluxo IA WhatsApp
- Como agora **todo** envio do site vira um INSERT em `leads`, o trigger `disparar_ia_whatsapp` vai disparar a saudação automática para cada novo lead. Isso é o comportamento desejado (você já confirmou).
- Como salvaguarda contra spam (mesmo telefone enviando o form 5x em 5 min), adicionar no edge function `ia-whatsapp-greeting` um early-return se já existir uma mensagem `ia_conversas` para o mesmo telefone nos últimos 10 minutos.

## Não está no escopo

- Tabela `site_submissions` de auditoria (você não pediu).
- Mudar a janela de dedup ou a policy de `lead_interacoes`.

## Teste após aplicar

1. Preencher form em `/contato` com seu telefone `15981788214`.
2. Esperado: novo lead aparece no CRM com tag `recontato` e observação apontando o lead anterior.
3. WhatsApp recebe saudação da IA (se IA estiver ligada e for o 1º envio em 10 min).
