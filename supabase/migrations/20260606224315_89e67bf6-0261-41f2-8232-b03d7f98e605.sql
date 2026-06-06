
-- 1. Estender lead_interacoes
ALTER TABLE public.lead_interacoes
  ADD COLUMN IF NOT EXISTS resultado text,
  ADD COLUMN IF NOT EXISTS notas_internas text,
  ADD COLUMN IF NOT EXISTS duracao_minutos integer,
  ADD COLUMN IF NOT EXISTS proxima_acao_em timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_lead_interacoes_updated_at ON public.lead_interacoes;
CREATE TRIGGER update_lead_interacoes_updated_at
  BEFORE UPDATE ON public.lead_interacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Atualizar last_contact_at no lead ao inserir interação
CREATE OR REPLACE FUNCTION public.touch_lead_last_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
     SET last_contact_at = NEW.created_at,
         updated_at = now()
   WHERE id = NEW.lead_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_touch_lead_last_contact ON public.lead_interacoes;
CREATE TRIGGER trg_touch_lead_last_contact
  AFTER INSERT ON public.lead_interacoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_lead_last_contact();

-- 3. Preferências de notificação em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_whatsapp boolean NOT NULL DEFAULT true;
