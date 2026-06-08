CREATE OR REPLACE FUNCTION public.disparar_ia_whatsapp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _enabled text;
  _digits text;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;

  SELECT value INTO _enabled FROM public.app_config WHERE key = 'ia_whatsapp_enabled';
  IF _enabled IS DISTINCT FROM 'true' THEN RETURN NEW; END IF;

  _digits := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  IF length(_digits) < 10 THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := 'https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/ia-whatsapp-greeting',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('lead_id', NEW.id),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'disparar_ia_whatsapp falhou: %', SQLERRM;
  RETURN NEW;
END;
$function$;