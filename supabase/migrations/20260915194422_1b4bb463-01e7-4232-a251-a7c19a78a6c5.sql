CREATE OR REPLACE FUNCTION public.log_historico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entidade text := TG_ARGV[0];
  v_nome text;
  v_id uuid;
  v_acao text;
  v_detalhes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criar';
    v_id := NEW.id;
    v_nome := CASE v_entidade WHEN 'vaga' THEN NEW.codigo::text ELSE NEW.nome::text END;
    IF NEW.imagem_url IS NOT NULL THEN v_detalhes := jsonb_build_object('com_imagem', true); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := NEW.id;
    v_nome := CASE v_entidade WHEN 'vaga' THEN NEW.codigo::text ELSE NEW.nome::text END;
    IF v_entidade = 'caixa' AND NEW.vaga_id IS DISTINCT FROM OLD.vaga_id THEN
      RETURN NEW;
    END IF;
    IF NEW.imagem_url IS DISTINCT FROM OLD.imagem_url THEN
      v_acao := 'imagem';
      v_detalhes := jsonb_build_object(
        'de', OLD.imagem_url IS NOT NULL,
        'para', NEW.imagem_url IS NOT NULL
      );
    ELSE
      v_acao := 'editar';
      v_detalhes := jsonb_build_object(
        'campos', (
          SELECT jsonb_object_agg(k, jsonb_build_object('de', to_jsonb(OLD) -> k, 'para', to_jsonb(NEW) -> k))
          FROM jsonb_object_keys(to_jsonb(NEW)) k
          WHERE (to_jsonb(NEW) -> k) IS DISTINCT FROM (to_jsonb(OLD) -> k)
            AND k NOT IN ('criado_em','id','imagem_url')
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'excluir';
    v_id := OLD.id;
    v_nome := CASE v_entidade WHEN 'vaga' THEN OLD.codigo::text ELSE OLD.nome::text END;
  END IF;

  INSERT INTO public.historico_eventos(usuario_id, usuario_email, acao, entidade, entidade_id, entidade_nome, detalhes)
  VALUES (auth.uid(), public.current_email(), v_acao, v_entidade, v_id, v_nome, v_detalhes);

  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $function$;