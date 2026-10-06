-- Reconcile the live Grok economy hardening migration.
-- The earlier 20261006120000 migration used CREATE OR REPLACE on
-- roflix_user_adjust_gem while changing its return type. PostgreSQL rejects
-- that operation, so this follow-up explicitly replaces the function.
-- This migration is intentionally idempotent and only repairs the RPC shape.

begin;

drop function if exists public.roflix_user_adjust_gem(bigint);

create function public.roflix_user_adjust_gem(p_delta bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g bigint;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  insert into public.roflix_game_stats(user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select coalesce(gems, 0)
    into g
    from public.roflix_game_stats
    where user_id = auth.uid();

  return jsonb_build_object(
    'gems', g,
    'mutated', false,
    'ignored_delta', coalesce(p_delta, 0)
  );
end;
$$;

revoke all on function public.roflix_user_adjust_gem(bigint) from public, anon;
grant execute on function public.roflix_user_adjust_gem(bigint) to authenticated;

commit;
