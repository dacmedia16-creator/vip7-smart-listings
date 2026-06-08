## Diagnóstico

- O lead de teste criado às 05:28 não disparou mensagem porque a proteção anti-duplicidade bloqueou saudação recente para o mesmo telefone.
- Antes disso, às 05:21, a função registrou `ziontalk-send ok` para `15981788214`, ou seja: a API aceitou o envio, mas isso não confirma entrega no WhatsApp.
- Como você não recebeu, precisamos validar se a API key nova está mesmo do canal que tem WhatsApp conectado/ativo e se o endpoint está retornando algum detalhe de fila/erro que hoje não aparece no log.

## Plano

1. Forçar um novo envio de teste para `15981788214`, ignorando a trava de saudação recente apenas para esse teste.
2. Registrar no log a resposta completa da ZionTalk nesse disparo, incluindo status/ID da mensagem quando houver.
3. Conferir se o lead ficou com `ia_last_message_at` atualizado após o envio.
4. Se a API responder “ok” de novo e mesmo assim não chegar, orientar a troca para a API key exata do canal conectado ao número certo no painel da ZionTalk.

## Detalhes técnicos

- Não vou mexer na interface do site.
- O teste será feito diretamente na função `ia-whatsapp-greeting` ou com um ajuste mínimo para permitir `force=true` em envio manual.
- A proteção anti-duplicidade continua ativa para leads reais; só será contornada no teste controlado.