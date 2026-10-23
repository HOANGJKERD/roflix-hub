-- Review public RoFlix profile and leaderboard RPCs.
-- Preserve intended public leaderboard/profile behavior while removing search_path ambiguity
-- and hiding profiles that are not active.
create or replace function public.roflix_leaderboard(p_limit integer default 50)
returns table(
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  level integer,
  exp bigint,
  gems bigint,
  episodes_watched bigint,
  gacha_pulls bigint,
  score numeric
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    row_number() over (
      order by coalesce(g.level,1) desc,
               coalesce(g.exp,0) desc,
               coalesce(g.episodes_watched,0) desc,
               coalesce(g.gems_earned,0) desc
    ) as rank,
    p.id,
    p.display_name,
    p.avatar_url,
    coalesce(g.level,1),
    coalesce(g.exp,0),
    coalesce(g.gems,0),
    coalesce(g.episodes_watched,0),
    coalesce(g.gacha_pulls,0),
    (coalesce(g.level,1)*100000 + coalesce(g.exp,0) +
      coalesce(g.episodes_watched,0)*25 + coalesce(g.gacha_pulls,0)*5)::numeric as score
  from public.profiles p
  left join public.roflix_game_stats g on g.user_id = p.id
  where coalesce(p.account_status,'active') = 'active'
  order by coalesce(g.level,1) desc,
           coalesce(g.exp,0) desc,
           coalesce(g.episodes_watched,0) desc,
           coalesce(g.gems_earned,0) desc
  limit greatest(1,least(p_limit,100));
$function$;

create or replace function public.roflix_public_profile(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id',p.id,
    'display_name',p.display_name,
    'bio',p.bio,
    'avatar_url',p.avatar_url,
    'banner_url',p.banner_url,
    'country',p.country,
    'created_at',p.created_at,
    'level',coalesce(gs.level,1),
    'exp',coalesce(gs.exp,0),
    'movies_watched',coalesce(gs.movies_watched,0),
    'episodes_watched',coalesce(gs.episodes_watched,0),
    'watch_minutes',coalesce(gs.watch_minutes,0),
    'gacha_pulls',coalesce(gs.gacha_pulls,0)
  )
  from public.profiles p
  left join public.roflix_game_stats gs on gs.user_id = p.id
  where p.id = p_user_id
    and coalesce(p.account_status,'active') = 'active';
$function$;

revoke all on function public.roflix_leaderboard(integer) from public;
grant execute on function public.roflix_leaderboard(integer) to anon, authenticated;
revoke all on function public.roflix_public_profile(uuid) from public;
grant execute on function public.roflix_public_profile(uuid) to anon, authenticated;
