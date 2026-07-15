
-- =========================================================
-- FASE 2: AUTH, ROLES, PROFILES, HISTORICO
-- =========================================================

-- Trigger util p/ updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- ENUM app_role ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('administrador','operador','visitante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- PROFILES ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nome_exibicao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- USER_ROLES ----------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.pode_editar(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'administrador') OR public.has_role(_user_id,'operador');
$$;

-- Policies profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'administrador'));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'administrador'));
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Policies user_roles
DROP POLICY IF EXISTS ur_select_own ON public.user_roles;
DROP POLICY IF EXISTS ur_select_admin ON public.user_roles;
DROP POLICY IF EXISTS ur_admin_all ON public.user_roles;
CREATE POLICY ur_select_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ur_select_admin ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'administrador'));
CREATE POLICY ur_admin_all ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador'))
  WITH CHECK (public.has_role(auth.uid(),'administrador'));

-- Trigger novo usuario: cria profile + role (primeiro = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total_users int;
BEGIN
  INSERT INTO public.profiles(id,email,nome_exibicao)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome_exibicao', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO total_users FROM public.user_roles;
  IF total_users = 0 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'administrador') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'visitante') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RESET RLS DAS TABELAS DE NEGÓCIO
-- =========================================================
DROP POLICY IF EXISTS setores_all ON public.setores;
DROP POLICY IF EXISTS vagas_all ON public.vagas;
DROP POLICY IF EXISTS caixas_all ON public.caixas;
DROP POLICY IF EXISTS mov_all ON public.movimentacoes_caixa;

-- SETORES
REVOKE ALL ON public.setores FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;
CREATE POLICY setores_select ON public.setores FOR SELECT TO authenticated USING (true);
CREATE POLICY setores_insert ON public.setores FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY setores_update ON public.setores FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY setores_delete ON public.setores FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

-- VAGAS
REVOKE ALL ON public.vagas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vagas TO authenticated;
GRANT ALL ON public.vagas TO service_role;
CREATE POLICY vagas_select ON public.vagas FOR SELECT TO authenticated USING (true);
CREATE POLICY vagas_insert ON public.vagas FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY vagas_update ON public.vagas FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY vagas_delete ON public.vagas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

-- CAIXAS
REVOKE ALL ON public.caixas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixas TO authenticated;
GRANT ALL ON public.caixas TO service_role;
CREATE POLICY caixas_select ON public.caixas FOR SELECT TO authenticated USING (true);
CREATE POLICY caixas_insert ON public.caixas FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY caixas_update ON public.caixas FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY caixas_delete ON public.caixas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

-- MOVIMENTACOES
REVOKE ALL ON public.movimentacoes_caixa FROM anon;
GRANT SELECT, INSERT ON public.movimentacoes_caixa TO authenticated;
GRANT ALL ON public.movimentacoes_caixa TO service_role;
CREATE POLICY mov_select ON public.movimentacoes_caixa FOR SELECT TO authenticated USING (true);
CREATE POLICY mov_insert ON public.movimentacoes_caixa FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));

-- =========================================================
-- HISTORICO_EVENTOS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.historico_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid,
  usuario_email text,
  acao text NOT NULL,             -- criar | editar | excluir | mover | imagem
  entidade text NOT NULL,         -- setor | vaga | caixa
  entidade_id uuid,
  entidade_nome text,
  detalhes jsonb
);
GRANT SELECT, INSERT ON public.historico_eventos TO authenticated;
GRANT ALL ON public.historico_eventos TO service_role;
ALTER TABLE public.historico_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_select ON public.historico_eventos;
DROP POLICY IF EXISTS hist_insert ON public.historico_eventos;
CREATE POLICY hist_select ON public.historico_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY hist_insert ON public.historico_eventos FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hist_criado ON public.historico_eventos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_hist_entidade ON public.historico_eventos(entidade, entidade_id);

-- Helper para email do usuário atual
CREATE OR REPLACE FUNCTION public.current_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Trigger genérico
CREATE OR REPLACE FUNCTION public.log_historico()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entidade text := TG_ARGV[0];
  v_nome text;
  v_id uuid;
  v_acao text;
  v_detalhes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criar';
    v_id := NEW.id;
    v_nome := CASE v_entidade WHEN 'vaga' THEN NEW.codigo ELSE NEW.nome END;
    IF NEW.imagem_url IS NOT NULL THEN v_detalhes := jsonb_build_object('com_imagem', true); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := NEW.id;
    v_nome := CASE v_entidade WHEN 'vaga' THEN NEW.codigo ELSE NEW.nome END;
    IF v_entidade = 'caixa' AND NEW.vaga_id IS DISTINCT FROM OLD.vaga_id THEN
      -- mover: será logado pela tabela movimentacoes; ignorar aqui
      RETURN NEW;
    END IF;
    IF NEW.imagem_url IS DISTINCT FROM OLD.imagem_url THEN
      v_acao := 'imagem';
      v_detalhes := jsonb_build_object(
        'de', OLD.imagem_url IS NOT NULL,
        'para', NEW.imagem_url IS NOT NULL
      );
    ELSE
      v_acao := 'editar';
      v_detalhes := jsonb_build_object(
        'campos', (
          SELECT jsonb_object_agg(k, jsonb_build_object('de', to_jsonb(OLD) -> k, 'para', to_jsonb(NEW) -> k))
          FROM jsonb_object_keys(to_jsonb(NEW)) k
          WHERE (to_jsonb(NEW) -> k) IS DISTINCT FROM (to_jsonb(OLD) -> k)
            AND k NOT IN ('criado_em','id','imagem_url')
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'excluir';
    v_id := OLD.id;
    v_nome := CASE v_entidade WHEN 'vaga' THEN OLD.codigo ELSE OLD.nome END;
  END IF;

  INSERT INTO public.historico_eventos(usuario_id, usuario_email, acao, entidade, entidade_id, entidade_nome, detalhes)
  VALUES (auth.uid(), public.current_email(), v_acao, v_entidade, v_id, v_nome, v_detalhes);

  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;

-- Trigger específico p/ movimentacoes
CREATE OR REPLACE FUNCTION public.log_movimentacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  nome_caixa text;
  cod_origem text;
  cod_destino text;
BEGIN
  SELECT nome INTO nome_caixa FROM public.caixas WHERE id = NEW.caixa_id;
  SELECT codigo INTO cod_origem FROM public.vagas WHERE id = NEW.vaga_origem_id;
  SELECT codigo INTO cod_destino FROM public.vagas WHERE id = NEW.vaga_destino_id;
  INSERT INTO public.historico_eventos(usuario_id, usuario_email, acao, entidade, entidade_id, entidade_nome, detalhes)
  VALUES (auth.uid(), public.current_email(), 'mover', 'caixa', NEW.caixa_id, nome_caixa,
    jsonb_build_object('de', cod_origem, 'para', cod_destino,
                       'vaga_origem_id', NEW.vaga_origem_id,
                       'vaga_destino_id', NEW.vaga_destino_id));
  RETURN NEW;
END; $$;

-- Attach triggers
DROP TRIGGER IF EXISTS hist_setores ON public.setores;
CREATE TRIGGER hist_setores AFTER INSERT OR UPDATE OR DELETE ON public.setores
FOR EACH ROW EXECUTE FUNCTION public.log_historico('setor');

DROP TRIGGER IF EXISTS hist_vagas ON public.vagas;
CREATE TRIGGER hist_vagas AFTER INSERT OR UPDATE OR DELETE ON public.vagas
FOR EACH ROW EXECUTE FUNCTION public.log_historico('vaga');

DROP TRIGGER IF EXISTS hist_caixas ON public.caixas;
CREATE TRIGGER hist_caixas AFTER INSERT OR UPDATE OR DELETE ON public.caixas
FOR EACH ROW EXECUTE FUNCTION public.log_historico('caixa');

DROP TRIGGER IF EXISTS hist_movimentacoes ON public.movimentacoes_caixa;
CREATE TRIGGER hist_movimentacoes AFTER INSERT ON public.movimentacoes_caixa
FOR EACH ROW EXECUTE FUNCTION public.log_movimentacao();
