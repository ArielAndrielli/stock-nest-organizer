DROP POLICY IF EXISTS caixas_select ON public.caixas;
CREATE POLICY caixas_select ON public.caixas FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));
DROP POLICY IF EXISTS vagas_select ON public.vagas;
CREATE POLICY vagas_select ON public.vagas FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));
DROP POLICY IF EXISTS mov_select ON public.movimentacoes_caixa;
CREATE POLICY mov_select ON public.movimentacoes_caixa FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));