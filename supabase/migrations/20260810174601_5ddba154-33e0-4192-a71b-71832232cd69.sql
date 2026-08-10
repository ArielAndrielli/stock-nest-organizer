-- ITENS
CREATE TABLE public.itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_interno bigint NOT NULL,
  referencia text,
  descricao text,
  marca text,
  setor text,
  tipo_item text,
  status text,
  imagem_url text,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX itens_codigo_interno_key ON public.itens(codigo_interno);
CREATE INDEX itens_marca_idx ON public.itens(marca);
CREATE INDEX itens_setor_idx ON public.itens(setor);
CREATE INDEX itens_tipo_idx ON public.itens(tipo_item);
CREATE INDEX itens_status_idx ON public.itens(status);
CREATE INDEX itens_referencia_trgm_idx ON public.itens(referencia text_pattern_ops);
CREATE INDEX itens_busca_idx ON public.itens USING gin (
  to_tsvector('simple', coalesce(referencia,'') || ' ' || coalesce(descricao,'') || ' ' || coalesce(marca,'') || ' ' || coalesce(setor,''))
);
CREATE INDEX itens_extras_idx ON public.itens USING gin (extras);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO authenticated;
GRANT ALL ON public.itens TO service_role;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY itens_select ON public.itens FOR SELECT TO authenticated USING (true);
CREATE POLICY itens_insert ON public.itens FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY itens_update ON public.itens FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY itens_delete ON public.itens FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

CREATE TRIGGER itens_set_updated_at BEFORE UPDATE ON public.itens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CATALOGO DE CAMPOS
CREATE TABLE public.item_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  rotulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto',
  fixo boolean NOT NULL DEFAULT false,
  filtravel boolean NOT NULL DEFAULT false,
  visivel_padrao boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 100,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX item_campos_chave_key ON public.item_campos(chave);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_campos TO authenticated;
GRANT ALL ON public.item_campos TO service_role;
ALTER TABLE public.item_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_campos_select ON public.item_campos FOR SELECT TO authenticated USING (true);
CREATE POLICY item_campos_insert ON public.item_campos FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY item_campos_update ON public.item_campos FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY item_campos_delete ON public.item_campos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

CREATE TRIGGER item_campos_set_updated_at BEFORE UPDATE ON public.item_campos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.item_campos (chave, rotulo, tipo, fixo, filtravel, visivel_padrao, ordem) VALUES
  ('codigo_interno','Código Interno','numero',true,false,true,1),
  ('referencia','Referência','texto',true,false,true,2),
  ('descricao','Descrição','texto',true,false,true,3),
  ('marca','Marca','texto',true,true,true,4),
  ('setor','Setor','texto',true,true,true,5),
  ('tipo_item','Tipo de item','texto',true,true,false,6),
  ('status','Status','texto',true,true,false,7),
  ('imagem_url','Imagem','imagem',true,false,false,8);

-- PREFERENCIAS POR USUARIO
CREATE TABLE public.item_preferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  colunas_visiveis text[] NOT NULL DEFAULT ARRAY['codigo_interno','referencia','descricao','marca','setor'],
  ordem_colunas text[] NOT NULL DEFAULT ARRAY[]::text[],
  modo_visualizacao text NOT NULL DEFAULT 'grid',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_preferencias TO authenticated;
GRANT ALL ON public.item_preferencias TO service_role;
ALTER TABLE public.item_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_pref_select ON public.item_preferencias FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY item_pref_insert ON public.item_preferencias FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY item_pref_update ON public.item_preferencias FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY item_pref_delete ON public.item_preferencias FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER item_pref_set_updated_at BEFORE UPDATE ON public.item_preferencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();