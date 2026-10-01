CREATE OR REPLACE FUNCTION public.tem_papel(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;
REVOKE EXECUTE ON FUNCTION public.tem_papel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tem_papel(uuid) TO authenticated;
DROP POLICY IF EXISTS itens_select ON public.itens;
CREATE POLICY itens_select ON public.itens FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));
DROP POLICY IF EXISTS compromissos_select ON public.compromissos;
CREATE POLICY compromissos_select ON public.compromissos FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));
DROP POLICY IF EXISTS fornecedores_select ON public.fornecedores;
CREATE POLICY fornecedores_select ON public.fornecedores FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));