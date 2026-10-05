-- RoFlix: server-authoritative game state hardening
-- Applied to Supabase project rbbudoccewyvmbkpdfju on 2026-10-05.
-- Clients may read their own game state, but must not directly mutate
-- progression, balances, or Gacha inventory.

begin;

revoke all on table public.roflix_game_stats from anon, authenticated;
grant select on table public.roflix_game_stats to authenticated;

revoke all on table public.roflix_gacha_inventory from anon, authenticated;
grant select on table public.roflix_gacha_inventory to authenticated;

-- Backward-compatible legacy RPC. The browser-supplied state parameters are
-- intentionally ignored so an old client cannot overwrite authoritative data.
create or replace function public.roflix_sync_game_state(
  p_level integer,
  p_exp bigint,
  p_gems bigint,
  p_gems_earned bigint,
  p_movies_watched bigint,
  p_episodes_watched bigint,
  p_comments_count bigint,
  p_favorites_count bigint,
  p_watch_minutes bigint,
  p_gacha_pulls bigint
)
returns public.roflix_game_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.roflix_game_stats;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  insert into public.roflix_game_stats(user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select * into r
  from public.roflix_game_stats
  where user_id = auth.uid();

  return r;
end;
$$;

revoke all on function public.roflix_sync_game_state(
  integer,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint
) from public;
grant execute on function public.roflix_sync_game_state(
  integer,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint
) to authenticated;

-- This generic wallet mutation allowed any signed-in client to mint arbitrary
-- RoGem. Rewards and spending must use purpose-specific server RPCs instead.
revoke all on function public.roflix_user_adjust_gem(bigint) from public, anon, authenticated;

commit;
