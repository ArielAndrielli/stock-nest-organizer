ALTER TABLE public.itens
  ADD COLUMN IF NOT EXISTS unidade_medida text,
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custo_aquisicao numeric(14,2),
  ADD COLUMN IF NOT EXISTS preco_venda numeric(14,2),
  ADD COLUMN IF NOT EXISTS estoque_minimo numeric,
  ADD COLUMN IF NOT EXISTS estoque_maximo numeric,
  ADD COLUMN IF NOT EXISTS deposito text,
  ADD COLUMN IF NOT EXISTS corredor text,
  ADD COLUMN IF NOT EXISTS prateleira text;
UPDATE public.itens SET status = CASE WHEN lower(btrim(coalesce(status,''))) = 'inativo' THEN 'inativo' ELSE 'ativo' END;
ALTER TABLE public.itens ALTER COLUMN status SET DEFAULT 'ativo';
ALTER TABLE public.itens ADD CONSTRAINT itens_status_chk CHECK (status IN ('ativo','inativo'));
CREATE INDEX IF NOT EXISTS itens_codigo_barras_idx ON public.itens(codigo_barras);
CREATE INDEX IF NOT EXISTS itens_fornecedor_idx ON public.itens(fornecedor_id);
INSERT INTO public.item_campos(chave, rotulo, tipo, fixo, filtravel, visivel_padrao, ordem) VALUES
 ('unidade_medida','Unidade de medida','texto',true,true,false,20),
 ('codigo_barras','Código de barras','texto',true,false,false,21),
 ('fornecedor_id','Fornecedor','texto',true,true,false,22),
 ('custo_aquisicao','Custo de aquisição','numero',true,false,false,23),
 ('preco_venda','Preço de venda','numero',true,false,false,24),
 ('estoque_minimo','Estoque mínimo','numero',true,false,false,25),
 ('estoque_maximo','Estoque máximo','numero',true,false,false,26),
 ('deposito','Depósito','texto',true,true,false,27),
 ('corredor','Corredor','texto',true,false,false,28),
 ('prateleira','Prateleira','texto',true,false,false,29)
ON CONFLICT (chave) DO UPDATE SET fixo = true, rotulo = EXCLUDED.rotulo, filtravel = EXCLUDED.filtravel;
UPDATE public.item_campos SET filtravel = true, fixo = true WHERE chave = 'status';
DROP POLICY IF EXISTS fornecedor_campos_select ON public.fornecedor_campos;
CREATE POLICY fornecedor_campos_select ON public.fornecedor_campos FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));
DROP POLICY IF EXISTS ordem_itens_select ON public.ordem_itens;
CREATE POLICY ordem_itens_select ON public.ordem_itens FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));
DROP POLICY IF EXISTS ordens_select ON public.ordens_producao;
CREATE POLICY ordens_select ON public.ordens_producao FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));