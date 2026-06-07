
CREATE OR REPLACE FUNCTION public.dashboard_funil_counts()
RETURNS TABLE(status text, total bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_crm_user(auth.uid()) THEN RAISE EXCEPTION 'sem permissao'; END IF;
  RETURN QUERY
    SELECT l.status_funil::text, COUNT(*)::bigint
    FROM public.leads l
    GROUP BY l.status_funil;
END; $$;

CREATE OR REPLACE FUNCTION public.dashboard_pipeline_total()
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _t numeric;
BEGIN
  IF NOT is_crm_user(auth.uid()) THEN RAISE EXCEPTION 'sem permissao'; END IF;
  SELECT COALESCE(SUM(orcamento_max), 0) INTO _t
  FROM public.leads
  WHERE status_funil NOT IN ('fechamento','perdido');
  RETURN _t;
END; $$;

CREATE OR REPLACE FUNCTION public.dashboard_leads_por_dia(_dias int DEFAULT 30)
RETURNS TABLE(dia date, total bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_crm_user(auth.uid()) THEN RAISE EXCEPTION 'sem permissao'; END IF;
  RETURN QUERY
    SELECT d::date AS dia,
           COALESCE(COUNT(l.id), 0)::bigint AS total
    FROM generate_series(
           (current_date - (_dias - 1))::date,
           current_date,
           interval '1 day'
         ) d
    LEFT JOIN public.leads l
      ON date_trunc('day', l.created_at)::date = d::date
    GROUP BY d
    ORDER BY d;
END; $$;

CREATE OR REPLACE FUNCTION public.dashboard_ranking_corretores(_limit int DEFAULT 8)
RETURNS TABLE(corretor_id uuid, nome text, total bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_crm_user(auth.uid()) THEN RAISE EXCEPTION 'sem permissao'; END IF;
  RETURN QUERY
    SELECT l.corretor_id, COALESCE(p.nome, 'Sem nome') AS nome, COUNT(*)::bigint AS total
    FROM public.leads l
    LEFT JOIN public.profiles p ON p.id = l.corretor_id
    WHERE l.corretor_id IS NOT NULL
      AND l.status_funil NOT IN ('fechamento','perdido')
    GROUP BY l.corretor_id, p.nome
    ORDER BY total DESC
    LIMIT _limit;
END; $$;
