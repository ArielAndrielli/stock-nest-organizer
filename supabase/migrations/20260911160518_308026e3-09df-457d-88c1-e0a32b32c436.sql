ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS codigo bigint,
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text;

CREATE SEQUENCE IF NOT EXISTS public.fornecedores_codigo_seq OWNED BY public.fornecedores.codigo;
GRANT USAGE, SELECT ON SEQUENCE public.fornecedores_codigo_seq TO authenticated, service_role;

UPDATE public.fornecedores SET razao_social = COALESCE(razao_social, nome) WHERE razao_social IS NULL;
UPDATE public.fornecedores SET codigo = nextval('public.fornecedores_codigo_seq') WHERE codigo IS NULL;

ALTER TABLE public.fornecedores ALTER COLUMN codigo SET DEFAULT nextval('public.fornecedores_codigo_seq');

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_codigo_key ON public.fornecedores (codigo);

CREATE OR REPLACE FUNCTION public.fornecedor_sincronizar_nome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.razao_social IS NULL OR btrim(NEW.razao_social) = '' THEN
    NEW.razao_social := NEW.nome;
  END IF;
  NEW.nome := COALESCE(NULLIF(btrim(NEW.razao_social), ''), NEW.nome);
  IF NEW.codigo IS NULL THEN
    NEW.codigo := nextval('public.fornecedores_codigo_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fornecedores_sync_nome ON public.fornecedores;
CREATE TRIGGER fornecedores_sync_nome
BEFORE INSERT OR UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.fornecedor_sincronizar_nome();

INSERT INTO public.fornecedor_campos (chave, rotulo, tipo, fixo, filtravel, visivel_padrao, ordem) VALUES
  ('codigo', 'Código', 'numero', true, true, true, 1),
  ('razao_social', 'Razão Social', 'texto', true, true, true, 2),
  ('nome_fantasia', 'Nome Fantasia', 'texto', true, true, true, 3),
  ('inscricao_estadual', 'Inscrição Estadual', 'texto', true, false, true, 5)
ON CONFLICT (chave) DO UPDATE SET rotulo = EXCLUDED.rotulo, fixo = true, ordem = EXCLUDED.ordem;