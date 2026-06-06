
-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'corretor', 'atendente');
CREATE TYPE public.lead_status AS ENUM ('novo', 'em_atendimento', 'visita_agendada', 'proposta_enviada', 'fechamento', 'perdido');
CREATE TYPE public.lead_origem AS ENUM ('site_avaliacao', 'site_contato', 'site_whatsapp', 'portal', 'rede_social', 'indicacao', 'manual', 'importado');
CREATE TYPE public.tarefa_prioridade AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE public.tarefa_status AS ENUM ('pendente', 'concluida', 'cancelada');
CREATE TYPE public.tarefa_tipo AS ENUM ('ligacao', 'whatsapp', 'email', 'visita', 'reuniao', 'outro');
CREATE TYPE public.interacao_tipo AS ENUM ('ligacao', 'whatsapp', 'email', 'visita', 'nota');
CREATE TYPE public.imovel_status AS ENUM ('disponivel', 'sob_proposta', 'vendido', 'alugado', 'inativo');
CREATE TYPE public.distribuicao_tipo AS ENUM ('rodizio', 'especialidade', 'equipe', 'carga', 'manual');

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  especialidades TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HAS_ROLE ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_crm_user(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gestor'))
$$;

-- ============ SETUP FIRST ADMIN ============
CREATE OR REPLACE FUNCTION public.count_admins()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM public.user_roles WHERE role = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.setup_first_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.count_admins() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_crm_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_gestor(UUID) TO authenticated;

-- ============ PROFILE AUTO-CREATE ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PROFILES POLICIES ============
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_crm_user(auth.uid()));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

-- ============ USER_ROLES POLICIES ============
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TAGS ============
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_read_crm" ON public.tags FOR SELECT TO authenticated USING (public.is_crm_user(auth.uid()));
CREATE POLICY "tags_manage_admin" ON public.tags FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT NOT NULL,
  origem public.lead_origem NOT NULL DEFAULT 'manual',
  tipo_imovel TEXT,
  finalidade TEXT,
  cidade_interesse TEXT,
  bairro_interesse TEXT,
  orcamento_min NUMERIC,
  orcamento_max NUMERIC,
  perfil_busca TEXT,
  status_funil public.lead_status NOT NULL DEFAULT 'novo',
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  observacoes TEXT,
  imovel_interesse_codigo TEXT,
  origem_url TEXT,
  last_contact_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_corretor_idx ON public.leads(corretor_id);
CREATE INDEX leads_status_idx ON public.leads(status_funil);
CREATE INDEX leads_telefone_idx ON public.leads(telefone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public can insert leads (from site forms)
CREATE POLICY "leads_insert_public" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Admin/gestor read all
CREATE POLICY "leads_select_admin_gestor" ON public.leads FOR SELECT TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
-- Corretor reads only own
CREATE POLICY "leads_select_corretor" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid());
-- Atendente reads unassigned + own
CREATE POLICY "leads_select_atendente" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'atendente') AND (corretor_id IS NULL OR corretor_id = auth.uid() OR created_by = auth.uid()));
-- Admin/gestor update/delete all
CREATE POLICY "leads_update_admin_gestor" ON public.leads FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "leads_delete_admin_gestor" ON public.leads FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
-- Corretor updates own
CREATE POLICY "leads_update_corretor" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid());
-- Atendente updates own/unassigned
CREATE POLICY "leads_update_atendente" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'atendente') AND (corretor_id IS NULL OR corretor_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'atendente'));

-- ============ LEAD INTERACOES ============
CREATE TABLE public.lead_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo public.interacao_tipo NOT NULL,
  descricao TEXT NOT NULL,
  autor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lead_interacoes_lead_idx ON public.lead_interacoes(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_interacoes TO authenticated;
GRANT ALL ON public.lead_interacoes TO service_role;
ALTER TABLE public.lead_interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interacoes_select" ON public.lead_interacoes FOR SELECT TO authenticated
  USING (public.is_crm_user(auth.uid()));
CREATE POLICY "interacoes_insert" ON public.lead_interacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_crm_user(auth.uid()));
CREATE POLICY "interacoes_update_admin" ON public.lead_interacoes FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "interacoes_delete_admin" ON public.lead_interacoes FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

-- ============ LEAD DOCUMENTOS ============
CREATE TABLE public.lead_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  mime TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_documentos TO authenticated;
GRANT ALL ON public.lead_documentos TO service_role;
ALTER TABLE public.lead_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_docs_crm" ON public.lead_documentos FOR ALL TO authenticated
  USING (public.is_crm_user(auth.uid())) WITH CHECK (public.is_crm_user(auth.uid()));

-- ============ LEAD DISTRIBUICOES ============
CREATE TABLE public.lead_distribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo_distribuicao public.distribuicao_tipo NOT NULL,
  distribuido_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lead_distribuicoes TO authenticated;
GRANT ALL ON public.lead_distribuicoes TO service_role;
ALTER TABLE public.lead_distribuicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dist_select" ON public.lead_distribuicoes FOR SELECT TO authenticated USING (public.is_crm_user(auth.uid()));
CREATE POLICY "dist_insert_admin" ON public.lead_distribuicoes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));

-- ============ IMOVEIS PROPRIOS ============
CREATE TABLE public.imoveis_proprios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_interno TEXT UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL,
  finalidade TEXT NOT NULL DEFAULT 'venda',
  cep TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT DEFAULT 'SP',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  area NUMERIC,
  area_total NUMERIC,
  quartos INTEGER,
  suites INTEGER,
  banheiros INTEGER,
  vagas INTEGER,
  preco NUMERIC NOT NULL,
  condominio NUMERIC,
  iptu NUMERIC,
  caracteristicas TEXT[] DEFAULT '{}',
  video_url TEXT,
  tour_360_url TEXT,
  fotos TEXT[] DEFAULT '{}',
  documentos JSONB DEFAULT '[]',
  status public.imovel_status NOT NULL DEFAULT 'disponivel',
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  destaque BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX imoveis_proprios_status_idx ON public.imoveis_proprios(status);
CREATE INDEX imoveis_proprios_ativo_idx ON public.imoveis_proprios(ativo);
GRANT SELECT ON public.imoveis_proprios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imoveis_proprios TO authenticated;
GRANT ALL ON public.imoveis_proprios TO service_role;
ALTER TABLE public.imoveis_proprios ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_imoveis_updated BEFORE UPDATE ON public.imoveis_proprios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- public sees only active+available
CREATE POLICY "imoveis_public_read" ON public.imoveis_proprios FOR SELECT TO anon, authenticated
  USING (ativo = true AND status IN ('disponivel','sob_proposta'));
-- crm reads all
CREATE POLICY "imoveis_crm_read_all" ON public.imoveis_proprios FOR SELECT TO authenticated
  USING (public.is_crm_user(auth.uid()));
CREATE POLICY "imoveis_admin_write" ON public.imoveis_proprios FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "imoveis_corretor_write_own" ON public.imoveis_proprios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid());

-- ============ TAREFAS ============
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  imovel_id UUID REFERENCES public.imoveis_proprios(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo public.tarefa_tipo NOT NULL DEFAULT 'outro',
  data_hora TIMESTAMPTZ NOT NULL,
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prioridade public.tarefa_prioridade NOT NULL DEFAULT 'media',
  status public.tarefa_status NOT NULL DEFAULT 'pendente',
  lembrete_enviado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tarefas_responsavel_idx ON public.tarefas(responsavel_id);
CREATE INDEX tarefas_data_idx ON public.tarefas(data_hora);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tarefas_updated BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "tarefas_select" ON public.tarefas FOR SELECT TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "tarefas_insert" ON public.tarefas FOR INSERT TO authenticated
  WITH CHECK (public.is_crm_user(auth.uid()));
CREATE POLICY "tarefas_update" ON public.tarefas FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()) OR responsavel_id = auth.uid())
  WITH CHECK (public.is_admin_or_gestor(auth.uid()) OR responsavel_id = auth.uid());
CREATE POLICY "tarefas_delete" ON public.tarefas FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()) OR created_by = auth.uid());

-- ============ DISTRIBUICAO REGRAS ============
CREATE TABLE public.distribuicao_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo public.distribuicao_tipo NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  prioridade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribuicao_regras TO authenticated;
GRANT ALL ON public.distribuicao_regras TO service_role;
ALTER TABLE public.distribuicao_regras ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_distregras_updated BEFORE UPDATE ON public.distribuicao_regras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "distregras_read_crm" ON public.distribuicao_regras FOR SELECT TO authenticated USING (public.is_crm_user(auth.uid()));
CREATE POLICY "distregras_admin" ON public.distribuicao_regras FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id TEXT,
  dados JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_entidade_idx ON public.activity_log(entidade, entidade_id);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_read_admin" ON public.activity_log FOR SELECT TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "log_insert_crm" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (public.is_crm_user(auth.uid()));

-- ============ FIND DUPLICATE LEAD ============
CREATE OR REPLACE FUNCTION public.find_duplicate_lead(_telefone TEXT, _email TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.leads
  WHERE (telefone = _telefone OR (email IS NOT NULL AND _email IS NOT NULL AND lower(email) = lower(_email)))
    AND created_at > now() - INTERVAL '30 days'
  ORDER BY created_at DESC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.find_duplicate_lead(TEXT, TEXT) TO anon, authenticated;
