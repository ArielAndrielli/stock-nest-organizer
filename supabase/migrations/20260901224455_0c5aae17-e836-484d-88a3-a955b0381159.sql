CREATE TABLE public.compromissos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  inicio timestamptz NOT NULL,
  fim timestamptz,
  dia_inteiro boolean NOT NULL DEFAULT false,
  local text,
  categoria text NOT NULL DEFAULT 'outro',
  ordem_id uuid REFERENCES public.ordens_producao(id) ON DELETE SET NULL,
  criado_por uuid,
  criado_por_email text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compromissos TO authenticated;
GRANT ALL ON public.compromissos TO service_role;

ALTER TABLE public.compromissos ENABLE ROW LEVEL SECURITY;

CREATE POLICY compromissos_select ON public.compromissos FOR SELECT TO authenticated USING (true);
CREATE POLICY compromissos_insert ON public.compromissos FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY compromissos_update ON public.compromissos FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid())) WITH CHECK (public.pode_editar(auth.uid()));
CREATE POLICY compromissos_delete ON public.compromissos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE INDEX compromissos_inicio_idx ON public.compromissos (inicio);

CREATE TRIGGER compromissos_set_atualizado_em BEFORE UPDATE ON public.compromissos
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();