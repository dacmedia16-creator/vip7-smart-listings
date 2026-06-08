## Ajuste no webhook ZionTalk → IA

A configuração no ZionTalk está **correta** (evento "Mensagem recebida", URL e canal certos). Mas o payload chega no formato aninhado do ZionTalk:

```json
{
  "evento": "mensagem.recebida",
  "contato": { "telefone": "+55...", "nome": "..." },
  "mensagem": { "texto": "...", "canal": "...", "tipo": "text" }
}
```

E hoje a função `ia-whatsapp-inbound` só procura telefone/mensagem nos campos do topo — então retorna `400 missing phone or message`.

### O que vou alterar

**1 arquivo:** `supabase/functions/ia-whatsapp-inbound/index.ts`

Atualizar `extractPayload()` para:
- Ler `contato.telefone` → telefone
- Ler `mensagem.texto` → texto
- Ler `contato.nome` → nome (pra log/match futuro)
- Ler `mensagem.tipo` → tipo (ignorar se vier algo diferente de `text`, ex.: áudio/imagem, com mensagem amigável "ainda não consigo processar áudio/imagem, pode me escrever?")
- Manter os fallbacks atuais (`phone`, `message`, etc.) pra não quebrar testes manuais

**Log do payload bruto** na primeira linha do handler (`console.log(JSON.stringify(payload).slice(0,500))`) pra confirmarmos o formato real em produção. Removo depois.

### Segurança (recomendado mas opcional)

Hoje o webhook está **aberto**. Pra travar:
1. Em **Configurações avançadas** do gatilho ZionTalk, adicionar header:
   `Authorization: Bearer SEU_TOKEN_AQUI`
2. Definir o secret `ZIONTALK_INBOUND_TOKEN` no projeto com o mesmo valor.

Posso deixar pra fazer isso depois do primeiro teste funcionar — confirma se quer ativar agora ou depois.

### Teste

Depois do deploy: enviar uma mensagem real do WhatsApp pro número 15996659107 a partir de um telefone que já existe como lead no CRM (últimos 90 dias) e checar logs.
