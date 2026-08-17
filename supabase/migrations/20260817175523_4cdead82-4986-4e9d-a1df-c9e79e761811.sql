-- 1. Corrige gatilhos que gravavam em coluna inexistente "updated_at"
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS itens_set_updated_at ON public.itens;
CREATE TRIGGER itens_set_atualizado_em BEFORE UPDATE ON public.itens
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS item_campos_set_updated_at ON public.item_campos;
CREATE TRIGGER item_campos_set_atualizado_em BEFORE UPDATE ON public.item_campos
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS item_pref_set_updated_at ON public.item_preferencias;
CREATE TRIGGER item_pref_set_atualizado_em BEFORE UPDATE ON public.item_preferencias
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- 2. Preferencia de registros por pagina
ALTER TABLE public.item_preferencias ADD COLUMN IF NOT EXISTS por_pagina integer NOT NULL DEFAULT 25;

-- 3. Ordens de producao
DO $$ BEGIN
  CREATE TYPE public.status_ordem AS ENUM ('aguardando_separacao','em_separacao','separacao_concluida','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.ordens_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  referencia text NOT NULL,
  descricao text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  status public.status_ordem NOT NULL DEFAULT 'aguardando_separacao',
  observacoes text,
  criado_por uuid,
  criado_por_email text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_producao TO authenticated;
GRANT ALL ON public.ordens_producao TO service_role;
ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordens_select ON public.ordens_producao FOR SELECT TO authenticated USING (true);
CREATE POLICY ordens_insert ON public.ordens_producao FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY ordens_update ON public.ordens_producao FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY ordens_delete ON public.ordens_producao FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

CREATE TRIGGER ordens_set_atualizado_em BEFORE UPDATE ON public.ordens_producao
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TABLE public.ordem_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.itens(id) ON DELETE SET NULL,
  tipo_material text NOT NULL,
  referencia text,
  descricao text,
  quantidade numeric NOT NULL DEFAULT 1,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ordem_itens_ordem_id_idx ON public.ordem_itens(ordem_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordem_itens TO authenticated;
GRANT ALL ON public.ordem_itens TO service_role;
ALTER TABLE public.ordem_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordem_itens_select ON public.ordem_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY ordem_itens_insert ON public.ordem_itens FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY ordem_itens_update ON public.ordem_itens FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY ordem_itens_delete ON public.ordem_itens FOR DELETE TO authenticated USING (public.pode_editar(auth.uid()));