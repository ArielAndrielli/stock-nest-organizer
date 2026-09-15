REVOKE EXECUTE ON FUNCTION public.log_historico() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_movimentacao() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_email() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pode_editar(uuid) FROM anon;