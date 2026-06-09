## Problema

O formulário de Contato (e também Avaliação / WhatsApp) do site público chama `INSERT INTO public.leads`. A política RLS atual `leads_insert_anon` só vale para o role `anon`. Quando o visitante está autenticado em outra aba do mesmo domínio (ex.: Denis logado no CRM em `vipsevenimoveis.com.br/crm`), o cliente Supabase manda o token JWT e o Postgres usa o role `authenticated`. Aí cai na política `leads_insert_authenticated`, que exige `is_crm_user(auth.uid())` — e mesmo passando, qualquer falha intermediária bloqueia. Resultado: erro **"new row violates row-level security policy for table leads"**.

Além disso, a política `leads_insert_anon` exige `status_funil = 'novo' AND corretor_id IS NULL AND created_by IS NULL`, o que é frágil (depende de defaults e nunca permite tags/recontato com corretor pré-atribuído).

## Solução

Criar uma política única e explícita para captação pública, válida para `anon` **e** `authenticated`, que aceite qualquer insert cujo `origem` seja um dos canais públicos do site (`site_contato`, `site_avaliacao`, `site_whatsapp`, `portal_grupozap`, etc.), independente do usuário estar logado.

### Migration

1. `DROP POLICY leads_insert_anon ON public.leads;`
2. `CREATE POLICY leads_insert_publico ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (origem IN ('site_contato','site_avaliacao','site_whatsapp','portal_grupozap','portal_zap','portal_vivareal','portal_olx','manual') AND corretor_id IS NULL AND created_by IS NULL AND status_funil = 'novo');`
3. Manter `leads_insert_authenticated` como está (para criação manual no CRM com qualquer origem/status/corretor).

Isso resolve o erro sem abrir nenhuma brecha: o público só pode criar leads "novos", sem corretor e sem created_by, marcados com uma origem válida do site.

Nenhuma mudança de código frontend é necessária — o `capturarLead` já envia `origem: 'site_contato'` e deixa os demais campos vazios.