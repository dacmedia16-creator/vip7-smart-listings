## Problema

Lead `Denis Fabio` (05:18 UTC) entrou normal mas a IA não chamou. Diagnóstico:

- Trigger `trg_ia_whatsapp_greeting` está ativo e roda.
- A função `disparar_ia_whatsapp` chama `extensions.http_post(...)`.
- No projeto, `http_post` só existe no schema `net` (pg_net). `extensions.http_post` lança erro.
- O `EXCEPTION WHEN OTHERS` engole o erro → lead salva, IA nunca é disparada.
- Confirmação: `net._http_response` não tem nenhuma chamada para `ia-whatsapp-greeting` depois das 05:17, e `ia_conversas` está vazia para esse lead.

Isso afeta **todos** os leads novos desde que esse trigger foi criado.

## Correção

Migration trocando a chamada na função `disparar_ia_whatsapp`:

```sql
CREATE OR REPLACE FUNCTION public.disparar_ia_whatsapp() ...
  PERFORM net.http_post(           -- antes: extensions.http_post
    url := 'https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/ia-whatsapp-greeting',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('lead_id', NEW.id)::jsonb,   -- net.http_post espera jsonb, não text
    timeout_milliseconds := 5000
  );
```

Mudanças vs. atual:
1. `extensions.http_post` → `net.http_post`
2. `body` passa a ser `jsonb` (assinatura de `net.http_post`), em vez de `text`

Mantém o `EXCEPTION WHEN OTHERS` pra nunca derrubar o INSERT do lead, mas troca `RAISE WARNING` por `RAISE LOG` pra ficar nos logs do Postgres.

## Reprocessar lead perdido

Depois de aplicar a migration, chamar manualmente a edge function `ia-whatsapp-greeting` com `lead_id=54aff7e6-d735-40f8-aa88-378c3787fa04` (o Denis Fabio) pra IA mandar a 1ª mensagem dele agora.

## Teste

1. Criar um lead de teste pelo `/contato` com seu telefone.
2. Conferir em `net._http_response` que apareceu chamada com status 200.
3. Conferir `ia_conversas` recebendo system+assistant pro novo lead.
4. WhatsApp recebe a saudação.

## Fora de escopo

- Nenhuma mudança em código frontend ou edge functions; só a função SQL do trigger.
