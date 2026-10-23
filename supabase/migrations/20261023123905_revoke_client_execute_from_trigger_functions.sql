-- Trigger and event-trigger functions are invoked by PostgreSQL trigger machinery.
-- They should not be directly executable through exposed API roles.
REVOKE EXECUTE ON FUNCTION public.roflix_create_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roflix_movie_comment_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roflix_notify_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roflix_notify_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roflix_protect_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roflix_release_schedule_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
