CREATE TABLE IF NOT EXISTS public._imp_stg (codigo integer PRIMARY KEY, data jsonb NOT NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON public._imp_stg TO authenticated;
GRANT ALL ON public._imp_stg TO service_role;
ALTER TABLE public._imp_stg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage stg" ON public._imp_stg FOR ALL USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));