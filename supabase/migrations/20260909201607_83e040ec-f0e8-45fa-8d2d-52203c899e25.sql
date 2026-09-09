CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text UNIQUE,
  telefone text,
  email text,
  cidade text,
  uf text,
  observacoes text,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY fornecedores_select ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY fornecedores_insert ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY fornecedores_update ON public.fornecedores FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY fornecedores_delete ON public.fornecedores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE TRIGGER fornecedores_set_atualizado_em BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER hist_fornecedores AFTER INSERT OR UPDATE OR DELETE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.log_historico('fornecedor');

CREATE INDEX idx_fornecedores_nome ON public.fornecedores (nome);

CREATE TABLE public.fornecedor_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  rotulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto',
  fixo boolean NOT NULL DEFAULT false,
  filtravel boolean NOT NULL DEFAULT false,
  visivel_padrao boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 100,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedor_campos TO authenticated;
GRANT ALL ON public.fornecedor_campos TO service_role;

ALTER TABLE public.fornecedor_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fornecedor_campos_select ON public.fornecedor_campos FOR SELECT TO authenticated USING (true);
CREATE POLICY fornecedor_campos_insert ON public.fornecedor_campos FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY fornecedor_campos_update ON public.fornecedor_campos FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY fornecedor_campos_delete ON public.fornecedor_campos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE TRIGGER fornecedor_campos_set_atualizado_em BEFORE UPDATE ON public.fornecedor_campos FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

INSERT INTO public.fornecedor_campos (chave, rotulo, fixo, filtravel, visivel_padrao, ordem) VALUES
  ('nome','Nome',true,true,true,1),
  ('cnpj','CNPJ',true,false,true,2),
  ('telefone','Telefone',true,false,true,3),
  ('email','E-mail',true,false,true,4),
  ('cidade','Cidade',true,true,true,5),
  ('uf','UF',true,true,true,6),
  ('observacoes','Observações',true,false,false,7);