CREATE OR REPLACE FUNCTION public.disparar_handoff_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
BEGIN
  IF NEW.ia_handoff IS DISTINCT FROM true THEN RETURN NEW; END IF;
  IF COALESCE(OLD.ia_handoff, false) = true THEN RETURN NEW; END IF;

  SELECT value INTO _secret FROM public.app_config WHERE key = 'cron_secret';
  IF _secret IS NULL OR _secret = '' THEN
    RAISE LOG 'disparar_handoff_notify: cron_secret missing in app_config';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/notify-handoff',
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', _secret),
    body := jsonb_build_object('lead_id', NEW.id),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'disparar_handoff_notify falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_handoff_notify ON public.leads;
CREATE TRIGGER trg_leads_handoff_notify
AFTER UPDATE OF ia_handoff ON public.leads
FOR EACH ROW
WHEN (NEW.ia_handoff = true AND COALESCE(OLD.ia_handoff, false) = false)
EXECUTE FUNCTION public.disparar_handoff_notify();