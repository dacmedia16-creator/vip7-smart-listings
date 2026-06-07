
CREATE OR REPLACE FUNCTION public.vincular_interessado_de_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _imovel_id uuid;
  _cliente_id uuid;
  _codigo int;
  _tel text;
BEGIN
  IF NEW.imovel_interesse_codigo IS NULL OR NEW.imovel_interesse_codigo = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    _codigo := NEW.imovel_interesse_codigo::int;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  SELECT id INTO _imovel_id
  FROM public.imoveis_proprios
  WHERE codigo_imoview = _codigo
  LIMIT 1;

  IF _imovel_id IS NULL THEN
    RETURN NEW;
  END IF;

  _tel := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');

  SELECT id INTO _cliente_id
  FROM public.clientes
  WHERE ativo = true
    AND (
      (NEW.email IS NOT NULL AND lower(email) = lower(NEW.email))
      OR (_tel <> '' AND regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = _tel)
      OR (_tel <> '' AND regexp_replace(COALESCE(telefone_secundario, ''), '\D', '', 'g') = _tel)
    )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.cliente_imoveis (cliente_id, imovel_id, papel)
  VALUES (_cliente_id, _imovel_id, 'interessado')
  ON CONFLICT (cliente_id, imovel_id, papel) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vincular_interessado_de_lead ON public.leads;
CREATE TRIGGER trg_vincular_interessado_de_lead
AFTER INSERT OR UPDATE OF imovel_interesse_codigo, telefone, email ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.vincular_interessado_de_lead();
