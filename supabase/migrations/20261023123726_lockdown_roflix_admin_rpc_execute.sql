-- Restrict privileged RoFlix admin RPCs to authenticated callers.
-- Each RPC must enforce administrator authorization in its function body.
DO $migration$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'roflix_admin_%'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', fn.nspname, fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', fn.nspname, fn.proname, fn.args);
  END LOOP;
END
$migration$;

-- Require an authenticated administrator before exposing aggregate platform analytics.
CREATE OR REPLACE FUNCTION public.roflix_admin_analytics(p_days integer DEFAULT 30)
RETURNS TABLE(
  day date,
  views bigint,
  plays bigint,
  unique_sessions bigint,
  new_users bigint,
  gacha_pulls bigint,
  watch_minutes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.roflix_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    gs.d::date,
    (SELECT count(*) FROM public.roflix_site_events e WHERE e.created_at >= gs.d AND e.created_at < gs.d + interval '1 day' AND e.event_type = 'movie_view'),
    (SELECT count(*) FROM public.roflix_site_events e WHERE e.created_at >= gs.d AND e.created_at < gs.d + interval '1 day' AND e.event_type = 'movie_play'),
    (SELECT count(DISTINCT e.session_id) FROM public.roflix_site_events e WHERE e.created_at >= gs.d AND e.created_at < gs.d + interval '1 day'),
    (SELECT count(*) FROM public.profiles p WHERE p.created_at >= gs.d AND p.created_at < gs.d + interval '1 day'),
    (SELECT coalesce(sum(h.count), 0) FROM public.roflix_gacha_pull_history h WHERE h.created_at >= gs.d AND h.created_at < gs.d + interval '1 day'),
    (SELECT coalesce(sum(g.watch_minutes), 0) FROM public.roflix_game_stats g WHERE g.updated_at >= gs.d AND g.updated_at < gs.d + interval '1 day')
  FROM generate_series(
    current_date - greatest(1, least(90, coalesce(p_days, 30))) + 1,
    current_date,
    interval '1 day'
  ) AS gs(d)
  ORDER BY gs.d;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.roflix_admin_analytics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roflix_admin_analytics(integer) TO authenticated;
