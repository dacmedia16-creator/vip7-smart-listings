
-- pg_net for async http from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1) ia_conversas
CREATE TABLE IF NOT EXISTS public.ia_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content text NOT NULL,
  imovel_codigo integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ia_conversas TO authenticated;
GRANT ALL ON public.ia_conversas TO service_role;

ALTER TABLE public.ia_conversas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_conv_read_crm ON public.ia_conversas;
CREATE POLICY ia_conv_read_crm ON public.ia_conversas
  FOR SELECT TO authenticated
  USING (public.is_crm_user(auth.uid()));

DROP POLICY IF EXISTS ia_conv_insert_crm ON public.ia_conversas;
CREATE POLICY ia_conv_insert_crm ON public.ia_conversas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_crm_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ia_conv_lead_created ON public.ia_conversas(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_conv_lead_imovel ON public.ia_conversas(lead_id, imovel_codigo);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_ia_conv_updated_at ON public.ia_conversas;
CREATE TRIGGER trg_ia_conv_updated_at
  BEFORE UPDATE ON public.ia_conversas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) leads new columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ia_handoff boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ia_handoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS ia_handoff_motivo text,
  ADD COLUMN IF NOT EXISTS ia_last_message_at timestamptz;

-- 3) app_config defaults
INSERT INTO public.app_config(key, value) VALUES
  ('ia_whatsapp_enabled','false'),
  ('ia_whatsapp_persona','Você é a assistente virtual da VIP Seven Imóveis. Tom acolhedor, direto, em pt-BR. Use no máximo 2-3 linhas por mensagem. Sempre que falar de um imóvel, inclua preço e localização. Nunca invente imóveis: use as ferramentas para consultar a base.'),
  ('ia_whatsapp_handoff_keywords','humano,atendente,corretor,agendar visita,marcar visita,quero visitar,ligar,falar com'),
  ('ia_whatsapp_truncate_chars','600')
ON CONFLICT (key) DO NOTHING;

-- 4) Trigger: dispara edge function ao inserir lead novo
CREATE OR REPLACE FUNCTION public.disparar_ia_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled text;
  _digits text;
BEGIN
  -- só roda em INSERT
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;

  -- skip se IA desligada
  SELECT value INTO _enabled FROM public.app_config WHERE key = 'ia_whatsapp_enabled';
  IF _enabled IS DISTINCT FROM 'true' THEN RETURN NEW; END IF;

  -- skip se telefone inválido (<10 dígitos)
  _digits := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  IF length(_digits) < 10 THEN RETURN NEW; END IF;

  -- dispara assíncrono via pg_net
  PERFORM extensions.http_post(
    url := 'https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/ia-whatsapp-greeting',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('lead_id', NEW.id)::text,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- nunca derruba o INSERT do lead
  RAISE WARNING 'disparar_ia_whatsapp falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ia_whatsapp_greeting ON public.leads;
CREATE TRIGGER trg_ia_whatsapp_greeting
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.disparar_ia_whatsapp();
