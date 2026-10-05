DROP POLICY IF EXISTS hist_select ON public.historico_eventos;
CREATE POLICY hist_select ON public.historico_eventos FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));
DROP POLICY IF EXISTS hist_insert ON public.historico_eventos;
CREATE POLICY hist_insert ON public.historico_eventos FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
DROP POLICY IF EXISTS item_campos_select ON public.item_campos;
CREATE POLICY item_campos_select ON public.item_campos FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));