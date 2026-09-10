REVOKE EXECUTE ON FUNCTION public.preencher_fotos_condominios() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preencher_fotos_condominios() TO service_role;