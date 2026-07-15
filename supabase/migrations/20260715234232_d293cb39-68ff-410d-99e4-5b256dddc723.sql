
CREATE OR REPLACE FUNCTION public.next_codigo_interno_vip()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max int;
  _next int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('codigo_interno_vip'));
  SELECT COALESCE(MAX((substring(codigo_interno FROM '^VIP(\d+)$'))::int), 0)
    INTO _max
    FROM public.imoveis_proprios
   WHERE codigo_interno ~ '^VIP\d+$';
  _next := _max + 1;
  RETURN 'VIP' || lpad(_next::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_codigo_interno_vip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.codigo_interno IS NULL OR NEW.codigo_interno = '')
     AND NEW.codigo_imoview IS NULL THEN
    NEW.codigo_interno := public.next_codigo_interno_vip();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_codigo_interno_vip ON public.imoveis_proprios;
CREATE TRIGGER trg_set_codigo_interno_vip
BEFORE INSERT ON public.imoveis_proprios
FOR EACH ROW
EXECUTE FUNCTION public.set_codigo_interno_vip();

-- Backfill: imóveis próprios sem código nenhum
UPDATE public.imoveis_proprios
   SET codigo_interno = public.next_codigo_interno_vip()
 WHERE (codigo_interno IS NULL OR codigo_interno = '')
   AND codigo_imoview IS NULL;
