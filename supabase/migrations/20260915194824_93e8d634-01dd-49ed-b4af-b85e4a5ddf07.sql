CREATE OR REPLACE FUNCTION public.log_historico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidade text := TG_ARGV[0];
  v_nome text;
  v_id uuid;
  v_acao text;
  v_detalhes jsonb := '{}'::jsonb;
  v_new jsonb;
  v_old jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criar';
    v_id := NEW.id;
    v_new := to_jsonb(NEW);
    v_nome := CASE v_entidade WHEN 'vaga' THEN v_new->>'codigo' ELSE v_new->>'nome' END;
    IF (v_new->>'imagem_url') IS NOT NULL THEN v_detalhes := jsonb_build_object('com_imagem', true); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := NEW.id;
    v_new := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    v_nome := CASE v_entidade WHEN 'vaga' THEN v_new->>'codigo' ELSE v_new->>'nome' END;
    IF v_entidade = 'caixa' AND (v_new->>'vaga_id') IS DISTINCT FROM (v_old->>'vaga_id') THEN
      RETURN NEW;
    END IF;
    IF (v_new->>'imagem_url') IS DISTINCT FROM (v_old->>'imagem_url') THEN
      v_acao := 'imagem';
      v_detalhes := jsonb_build_object(
        'de', (v_old->>'imagem_url') IS NOT NULL,
        'para', (v_new->>'imagem_url') IS NOT NULL
      );
    ELSE
      v_acao := 'editar';
      v_detalhes := jsonb_build_object(
        'campos', (
          SELECT jsonb_object_agg(k, jsonb_build_object('de', v_old -> k, 'para', v_new -> k))
          FROM jsonb_object_keys(v_new) k
          WHERE (v_new -> k) IS DISTINCT FROM (v_old -> k)
            AND k NOT IN ('criado_em','id','imagem_url')
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'excluir';
    v_id := OLD.id;
    v_old := to_jsonb(OLD);
    v_nome := CASE v_entidade WHEN 'vaga' THEN v_old->>'codigo' ELSE v_old->>'nome' END;
  END IF;

  INSERT INTO public.historico_eventos(usuario_id, usuario_email, acao, entidade, entidade_id, entidade_nome, detalhes)
  VALUES (auth.uid(), public.current_email(), v_acao, v_entidade, v_id, v_nome, v_detalhes);

  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;