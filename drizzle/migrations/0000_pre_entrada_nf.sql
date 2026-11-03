ALTER TABLE public.itens
  ADD COLUMN IF NOT EXISTS saldo_atual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_conhecido boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.itens.saldo_atual IS 'Saldo operacional; quando saldo_conhecido=false reflete apenas movimentações registradas, não o estoque físico';

CREATE OR REPLACE FUNCTION public.proteger_saldo_item() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.saldo_atual IS DISTINCT FROM OLD.saldo_atual OR NEW.saldo_conhecido IS DISTINCT FROM OLD.saldo_conhecido)
     AND coalesce(current_setting('app.saldo_rpc', true), '') <> '1' THEN
    RAISE EXCEPTION 'O saldo só pode ser alterado por entrada de nota ou ajuste de saldo inicial';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER itens_proteger_saldo BEFORE UPDATE ON public.itens FOR EACH ROW EXECUTE FUNCTION public.proteger_saldo_item();

CREATE OR REPLACE FUNCTION public.proteger_saldo_item_insert() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.saldo_rpc', true), '') <> '1' THEN
    NEW.saldo_atual := 0; NEW.saldo_conhecido := false;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER itens_proteger_saldo_ins BEFORE INSERT ON public.itens FOR EACH ROW EXECUTE FUNCTION public.proteger_saldo_item_insert();

CREATE TABLE public.notas_entrada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_acesso text,
  numero text,
  serie text,
  data_emissao date,
  emit_documento text,
  emit_razao_social text,
  emit_nome_fantasia text,
  emit_ie text,
  emit_uf text,
  emit_telefone text,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  valor_total numeric,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','confirmada','cancelada')),
  origem text NOT NULL DEFAULT 'xml',
  criado_por uuid DEFAULT auth.uid(),
  confirmado_por uuid,
  confirmado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notas_entrada_chave_ativa ON public.notas_entrada(chave_acesso) WHERE status <> 'cancelada' AND chave_acesso IS NOT NULL;
CREATE TRIGGER notas_entrada_atualizado BEFORE UPDATE ON public.notas_entrada FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE TABLE public.notas_entrada_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.notas_entrada(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  codigo_produto text,
  descricao text NOT NULL DEFAULT '',
  ean text,
  ncm text,
  unidade text,
  quantidade numeric NOT NULL DEFAULT 0,
  valor_unitario numeric,
  valor_total numeric,
  fator numeric NOT NULL DEFAULT 1,
  item_id uuid REFERENCES public.itens(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notas_entrada_linhas_nota ON public.notas_entrada_linhas(nota_id);

CREATE TABLE public.movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.itens(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada_nf','saldo_inicial')),
  quantidade numeric NOT NULL,
  saldo_anterior numeric NOT NULL,
  saldo_posterior numeric NOT NULL,
  saldo_anterior_conhecido boolean NOT NULL,
  custo_unitario numeric,
  nota_id uuid REFERENCES public.notas_entrada(id) ON DELETE SET NULL,
  linha_id uuid UNIQUE REFERENCES public.notas_entrada_linhas(id) ON DELETE SET NULL,
  observacao text,
  usuario_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX movimentacoes_estoque_item ON public.movimentacoes_estoque(item_id, criado_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_entrada TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_entrada_linhas TO authenticated;
GRANT SELECT ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.notas_entrada, public.notas_entrada_linhas, public.movimentacoes_estoque TO service_role;

ALTER TABLE public.notas_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_entrada_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY ne_select ON public.notas_entrada FOR SELECT TO authenticated USING (public.pode_editar(auth.uid()));
CREATE POLICY ne_insert ON public.notas_entrada FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()) AND status = 'rascunho');
CREATE POLICY ne_update ON public.notas_entrada FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid()) AND status = 'rascunho') WITH CHECK (public.pode_editar(auth.uid()) AND status IN ('rascunho','cancelada'));
CREATE POLICY ne_delete ON public.notas_entrada FOR DELETE TO authenticated USING (public.pode_editar(auth.uid()) AND status = 'rascunho');

CREATE POLICY nel_select ON public.notas_entrada_linhas FOR SELECT TO authenticated USING (public.pode_editar(auth.uid()));
CREATE POLICY nel_insert ON public.notas_entrada_linhas FOR INSERT TO authenticated WITH CHECK (public.pode_editar(auth.uid()) AND EXISTS (SELECT 1 FROM public.notas_entrada n WHERE n.id = nota_id AND n.status = 'rascunho'));
CREATE POLICY nel_update ON public.notas_entrada_linhas FOR UPDATE TO authenticated USING (public.pode_editar(auth.uid()) AND EXISTS (SELECT 1 FROM public.notas_entrada n WHERE n.id = nota_id AND n.status = 'rascunho')) WITH CHECK (public.pode_editar(auth.uid()) AND EXISTS (SELECT 1 FROM public.notas_entrada n WHERE n.id = nota_id AND n.status = 'rascunho'));
CREATE POLICY nel_delete ON public.notas_entrada_linhas FOR DELETE TO authenticated USING (public.pode_editar(auth.uid()) AND EXISTS (SELECT 1 FROM public.notas_entrada n WHERE n.id = nota_id AND n.status = 'rascunho'));

CREATE POLICY me_select ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (public.tem_papel(auth.uid()));

CREATE OR REPLACE FUNCTION public.confirmar_nota_entrada(_nota_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n public.notas_entrada%ROWTYPE;
  l record;
  it record;
  qtd numeric;
  total int := 0;
BEGIN
  IF NOT public.pode_editar(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para confirmar entradas'; END IF;
  SELECT * INTO n FROM public.notas_entrada WHERE id = _nota_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nota não encontrada'; END IF;
  IF n.status <> 'rascunho' THEN RAISE EXCEPTION 'Esta nota já foi %', CASE n.status WHEN 'confirmada' THEN 'confirmada' ELSE 'cancelada' END; END IF;
  IF n.chave_acesso IS NULL OR n.chave_acesso !~ '^[0-9]{44}$' THEN RAISE EXCEPTION 'Chave de acesso deve ter 44 dígitos'; END IF;
  IF coalesce(trim(n.numero),'') = '' OR n.data_emissao IS NULL OR coalesce(trim(n.emit_documento),'') = '' OR coalesce(trim(n.emit_razao_social),'') = '' OR n.valor_total IS NULL THEN
    RAISE EXCEPTION 'Dados da nota incompletos (número, emissão, fornecedor, documento e valor total)';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notas_entrada WHERE chave_acesso = n.chave_acesso AND id <> n.id AND status = 'confirmada') THEN
    RAISE EXCEPTION 'Já existe entrada confirmada para esta chave de acesso';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notas_entrada_linhas WHERE nota_id = n.id) THEN RAISE EXCEPTION 'A nota não possui linhas'; END IF;
  IF EXISTS (SELECT 1 FROM public.notas_entrada_linhas WHERE nota_id = n.id AND (quantidade <= 0 OR fator <= 0)) THEN RAISE EXCEPTION 'Quantidades e fatores devem ser positivos'; END IF;
  IF EXISTS (SELECT 1 FROM public.notas_entrada_linhas WHERE nota_id = n.id AND item_id IS NULL) THEN RAISE EXCEPTION 'Todas as linhas precisam estar vinculadas a um item'; END IF;

  PERFORM set_config('app.saldo_rpc', '1', true);
  FOR l IN SELECT * FROM public.notas_entrada_linhas WHERE nota_id = n.id ORDER BY ordem LOOP
    SELECT id, saldo_atual, saldo_conhecido INTO it FROM public.itens WHERE id = l.item_id FOR UPDATE;
    qtd := l.quantidade * l.fator;
    INSERT INTO public.movimentacoes_estoque(item_id, tipo, quantidade, saldo_anterior, saldo_posterior, saldo_anterior_conhecido, custo_unitario, nota_id, linha_id, usuario_id)
      VALUES (it.id, 'entrada_nf', qtd, it.saldo_atual, it.saldo_atual + qtd, it.saldo_conhecido,
              CASE WHEN l.valor_total IS NOT NULL THEN l.valor_total / qtd ELSE NULL END, n.id, l.id, auth.uid());
    UPDATE public.itens SET saldo_atual = saldo_atual + qtd WHERE id = it.id;
    total := total + 1;
  END LOOP;
  PERFORM set_config('app.saldo_rpc', '', true);

  UPDATE public.notas_entrada SET status = 'confirmada', confirmado_por = auth.uid(), confirmado_em = now() WHERE id = n.id;
  RETURN jsonb_build_object('linhas', total);
END $$;

CREATE OR REPLACE FUNCTION public.definir_saldo_inicial(_item_id uuid, _saldo numeric, _observacao text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record;
BEGIN
  IF NOT public.pode_editar(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _saldo IS NULL OR _saldo < 0 THEN RAISE EXCEPTION 'Saldo inicial deve ser zero ou positivo'; END IF;
  IF coalesce(trim(_observacao),'') = '' THEN RAISE EXCEPTION 'Informe a justificativa da contagem'; END IF;
  SELECT id, saldo_atual, saldo_conhecido INTO it FROM public.itens WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
  IF it.saldo_conhecido THEN RAISE EXCEPTION 'Este item já tem saldo inicial definido'; END IF;
  PERFORM set_config('app.saldo_rpc', '1', true);
  INSERT INTO public.movimentacoes_estoque(item_id, tipo, quantidade, saldo_anterior, saldo_posterior, saldo_anterior_conhecido, observacao, usuario_id)
    VALUES (it.id, 'saldo_inicial', _saldo - it.saldo_atual, it.saldo_atual, _saldo, false, _observacao, auth.uid());
  UPDATE public.itens SET saldo_atual = _saldo, saldo_conhecido = true WHERE id = it.id;
  PERFORM set_config('app.saldo_rpc', '', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.confirmar_nota_entrada(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.definir_saldo_inicial(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_nota_entrada(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_saldo_inicial(uuid, numeric, text) TO authenticated;