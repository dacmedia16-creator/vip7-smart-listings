
-- Round-robin distribution: assigns lead to corretor with fewest active leads
CREATE OR REPLACE FUNCTION public.distribuir_lead(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _corretor uuid;
BEGIN
  IF NOT is_admin_or_gestor(auth.uid()) THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;

  SELECT p.id INTO _corretor
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'corretor' AND p.ativo = true
  ORDER BY (
    SELECT COUNT(*) FROM public.leads l
    WHERE l.corretor_id = p.id
      AND l.status_funil NOT IN ('fechamento','perdido')
  ) ASC, random()
  LIMIT 1;

  IF _corretor IS NULL THEN
    RAISE EXCEPTION 'nenhum corretor ativo';
  END IF;

  UPDATE public.leads SET corretor_id = _corretor, updated_at = now() WHERE id = _lead_id;

  INSERT INTO public.lead_distribuicoes (lead_id, corretor_id, tipo_distribuicao, distribuido_por)
  VALUES (_lead_id, _corretor, 'round_robin', auth.uid());

  RETURN _corretor;
END;
$$;

-- Generic activity log trigger
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _acao text;
  _eid text;
BEGIN
  IF TG_OP = 'INSERT' THEN _acao := 'criou';
  ELSIF TG_OP = 'UPDATE' THEN _acao := 'editou';
  ELSE _acao := 'removeu';
  END IF;

  _eid := COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END)::text, '');

  INSERT INTO public.activity_log (entidade, entidade_id, acao, user_id, dados)
  VALUES (TG_TABLE_NAME, _eid, _acao, auth.uid(), 
    CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END);

  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_leads ON public.leads;
CREATE TRIGGER trg_log_leads
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_imoveis ON public.imoveis_proprios;
CREATE TRIGGER trg_log_imoveis
AFTER INSERT OR UPDATE OR DELETE ON public.imoveis_proprios
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_tarefas ON public.tarefas;
CREATE TRIGGER trg_log_tarefas
AFTER INSERT OR UPDATE OR DELETE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_upd_leads ON public.leads;
CREATE TRIGGER trg_upd_leads BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_upd_imoveis ON public.imoveis_proprios;
CREATE TRIGGER trg_upd_imoveis BEFORE UPDATE ON public.imoveis_proprios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_upd_tarefas ON public.tarefas;
CREATE TRIGGER trg_upd_tarefas BEFORE UPDATE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
