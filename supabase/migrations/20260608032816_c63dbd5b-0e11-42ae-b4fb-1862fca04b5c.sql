
-- Novos campos no imóvel
ALTER TABLE public.imoveis_proprios
  ADD COLUMN IF NOT EXISTS mostrar_endereco boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS tour_virtual_url text;

-- Enum de portais
DO $$ BEGIN
  CREATE TYPE public.portal_imobiliario AS ENUM ('zap_vivareal','olx','imovelweb','chavesnamao');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabela imovel_portais
CREATE TABLE IF NOT EXISTS public.imovel_portais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id uuid NOT NULL REFERENCES public.imoveis_proprios(id) ON DELETE CASCADE,
  portal public.portal_imobiliario NOT NULL,
  publicar boolean NOT NULL DEFAULT false,
  destaque_portal boolean NOT NULL DEFAULT false,
  ultimo_envio_em timestamptz,
  erro_validacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (imovel_id, portal)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imovel_portais TO authenticated;
GRANT SELECT ON public.imovel_portais TO anon;
GRANT ALL ON public.imovel_portais TO service_role;

ALTER TABLE public.imovel_portais ENABLE ROW LEVEL SECURITY;

CREATE POLICY imovel_portais_read_crm ON public.imovel_portais
  FOR SELECT TO authenticated
  USING (public.is_crm_user(auth.uid()));

CREATE POLICY imovel_portais_public_read ON public.imovel_portais
  FOR SELECT TO anon
  USING (publicar = true);

CREATE POLICY imovel_portais_admin_all ON public.imovel_portais
  FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY imovel_portais_corretor_own ON public.imovel_portais
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'corretor'::app_role)
    AND EXISTS (SELECT 1 FROM public.imoveis_proprios i
                WHERE i.id = imovel_portais.imovel_id AND i.corretor_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'corretor'::app_role)
    AND EXISTS (SELECT 1 FROM public.imoveis_proprios i
                WHERE i.id = imovel_portais.imovel_id AND i.corretor_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS imovel_portais_portal_publicar_idx
  ON public.imovel_portais (portal, publicar) WHERE publicar = true;

CREATE TRIGGER imovel_portais_set_updated_at
  BEFORE UPDATE ON public.imovel_portais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
