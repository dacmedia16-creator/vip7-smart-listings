
-- Enum de papel cliente x imóvel
DO $$ BEGIN
  CREATE TYPE public.cliente_papel AS ENUM ('proprietario','comprador','locatario','interessado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: tem papel CRM com acesso a clientes (admin/gestor/corretor)
CREATE OR REPLACE FUNCTION public.can_manage_clientes(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','gestor','corretor')
  )
$$;

-- Tabela clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_pessoa text NOT NULL DEFAULT 'fisica',
  cpf_cnpj text,
  rg text,
  email text,
  telefone text,
  telefone_secundario text,
  data_nascimento date,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  categorias text[] NOT NULL DEFAULT '{}',
  origem text NOT NULL DEFAULT 'manual',
  codigo_imoview integer UNIQUE,
  imoview_raw jsonb,
  imoview_sync_at timestamptz,
  imoview_hash text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clientes_nome_idx ON public.clientes (lower(nome));
CREATE INDEX clientes_cpf_idx ON public.clientes (cpf_cnpj);
CREATE INDEX clientes_telefone_idx ON public.clientes (telefone);
CREATE INDEX clientes_email_idx ON public.clientes (lower(email));
CREATE INDEX clientes_categorias_idx ON public.clientes USING gin (categorias);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_select ON public.clientes
  FOR SELECT TO authenticated
  USING (public.can_manage_clientes(auth.uid()));

CREATE POLICY clientes_insert ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clientes(auth.uid()));

CREATE POLICY clientes_update ON public.clientes
  FOR UPDATE TO authenticated
  USING (public.can_manage_clientes(auth.uid()))
  WITH CHECK (public.can_manage_clientes(auth.uid()));

CREATE POLICY clientes_delete ON public.clientes
  FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela cliente_imoveis
CREATE TABLE public.cliente_imoveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  imovel_id uuid NOT NULL REFERENCES public.imoveis_proprios(id) ON DELETE CASCADE,
  papel public.cliente_papel NOT NULL,
  percentual numeric,
  data_inicio date,
  data_fim date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, imovel_id, papel)
);

CREATE INDEX cliente_imoveis_cliente_idx ON public.cliente_imoveis (cliente_id);
CREATE INDEX cliente_imoveis_imovel_idx ON public.cliente_imoveis (imovel_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_imoveis TO authenticated;
GRANT ALL ON public.cliente_imoveis TO service_role;
ALTER TABLE public.cliente_imoveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY cliente_imoveis_select ON public.cliente_imoveis
  FOR SELECT TO authenticated
  USING (public.can_manage_clientes(auth.uid()));

CREATE POLICY cliente_imoveis_insert ON public.cliente_imoveis
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_clientes(auth.uid()));

CREATE POLICY cliente_imoveis_update ON public.cliente_imoveis
  FOR UPDATE TO authenticated
  USING (public.can_manage_clientes(auth.uid()))
  WITH CHECK (public.can_manage_clientes(auth.uid()));

CREATE POLICY cliente_imoveis_delete ON public.cliente_imoveis
  FOR DELETE TO authenticated
  USING (public.can_manage_clientes(auth.uid()));

CREATE TRIGGER cliente_imoveis_updated_at
  BEFORE UPDATE ON public.cliente_imoveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
