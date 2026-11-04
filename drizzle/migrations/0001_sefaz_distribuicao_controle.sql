CREATE TABLE public.sefaz_distribuicao (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ult_nsu text NOT NULL DEFAULT '000000000000000',
  max_nsu text,
  ultimo_cstat text,
  ultimo_motivo text,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sefaz_distribuicao TO authenticated;
GRANT ALL ON public.sefaz_distribuicao TO service_role;
ALTER TABLE public.sefaz_distribuicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY sefaz_sel ON public.sefaz_distribuicao FOR SELECT TO authenticated USING (public.pode_editar(auth.uid()));
CREATE POLICY sefaz_ins ON public.sefaz_distribuicao FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY sefaz_upd ON public.sefaz_distribuicao FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
INSERT INTO public.sefaz_distribuicao (id) VALUES (1) ON CONFLICT DO NOTHING;