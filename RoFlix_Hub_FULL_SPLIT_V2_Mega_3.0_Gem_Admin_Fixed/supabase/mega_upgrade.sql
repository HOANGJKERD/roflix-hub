-- RoFlix Pro Mega Upgrade
-- Chạy SAU các SQL V2 hiện tại.
-- Tạo dữ liệu cloud cho BXH thật, Watchlist, Gacha và thống kê tài khoản.

alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists avatar_url text default '';
alter table public.profiles add column if not exists banner_url text default '';
alter table public.profiles add column if not exists country text default 'Việt Nam';

create table if not exists public.roflix_game_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1 check (level >= 1),
  exp bigint not null default 0 check (exp >= 0),
  gems bigint not null default 0 check (gems >= 0),
  gems_earned bigint not null default 0 check (gems_earned >= 0),
  movies_watched bigint not null default 0 check (movies_watched >= 0),
  episodes_watched bigint not null default 0 check (episodes_watched >= 0),
  comments_count bigint not null default 0 check (comments_count >= 0),
  favorites_count bigint not null default 0 check (favorites_count >= 0),
  watch_minutes bigint not null default 0 check (watch_minutes >= 0),
  gacha_pulls bigint not null default 0 check (gacha_pulls >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.roflix_watchlist (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_slug text not null,
  movie_title text not null default '',
  origin_name text not null default '',
  poster_url text not null default '',
  source_id text not null default 'kkphim',
  created_at timestamptz not null default now(),
  unique(user_id, movie_slug)
);
create index if not exists roflix_watchlist_user_idx on public.roflix_watchlist(user_id, created_at desc);

create table if not exists public.roflix_gacha_inventory (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_key text not null,
  name text not null,
  movie text not null default '',
  rarity text not null,
  image text not null,
  obtained_at timestamptz not null default now()
);
create index if not exists roflix_gacha_inventory_user_idx on public.roflix_gacha_inventory(user_id, obtained_at desc);

alter table public.roflix_game_stats enable row level security;
alter table public.roflix_watchlist enable row level security;
alter table public.roflix_gacha_inventory enable row level security;

grant select, insert, update on public.roflix_game_stats to authenticated;
grant select, insert, update, delete on public.roflix_watchlist to authenticated;
grant select, insert on public.roflix_gacha_inventory to authenticated;

drop policy if exists "game stats own read" on public.roflix_game_stats;
create policy "game stats own read" on public.roflix_game_stats for select to authenticated using (user_id = auth.uid() or public.roflix_is_admin());
drop policy if exists "game stats own write" on public.roflix_game_stats;
create policy "game stats own write" on public.roflix_game_stats for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "game stats own update" on public.roflix_game_stats;
create policy "game stats own update" on public.roflix_game_stats for update to authenticated using (user_id = auth.uid() or public.roflix_is_admin()) with check (user_id = auth.uid() or public.roflix_is_admin());

drop policy if exists "watchlist own read" on public.roflix_watchlist;
create policy "watchlist own read" on public.roflix_watchlist for select to authenticated using (user_id = auth.uid() or public.roflix_is_admin());
drop policy if exists "watchlist own insert" on public.roflix_watchlist;
create policy "watchlist own insert" on public.roflix_watchlist for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "watchlist own delete" on public.roflix_watchlist;
create policy "watchlist own delete" on public.roflix_watchlist for delete to authenticated using (user_id = auth.uid() or public.roflix_is_admin());

drop policy if exists "gacha inventory own read" on public.roflix_gacha_inventory;
create policy "gacha inventory own read" on public.roflix_gacha_inventory for select to authenticated using (user_id = auth.uid() or public.roflix_is_admin());
drop policy if exists "gacha inventory own insert" on public.roflix_gacha_inventory;
create policy "gacha inventory own insert" on public.roflix_gacha_inventory for insert to authenticated with check (user_id = auth.uid());

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
language plpgsql security definer set search_path = public
as $$
declare r public.roflix_game_stats;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  insert into public.roflix_game_stats(user_id,level,exp,gems,gems_earned,movies_watched,episodes_watched,comments_count,favorites_count,watch_minutes,gacha_pulls,updated_at)
  values(auth.uid(),greatest(1,p_level),greatest(0,p_exp),greatest(0,p_gems),greatest(0,p_gems_earned),greatest(0,p_movies_watched),greatest(0,p_episodes_watched),greatest(0,p_comments_count),greatest(0,p_favorites_count),greatest(0,p_watch_minutes),greatest(0,p_gacha_pulls),now())
  on conflict(user_id) do update set
    level=excluded.level, exp=excluded.exp, gems=excluded.gems, gems_earned=excluded.gems_earned,
    movies_watched=excluded.movies_watched, episodes_watched=excluded.episodes_watched,
    comments_count=excluded.comments_count, favorites_count=excluded.favorites_count,
    watch_minutes=excluded.watch_minutes, gacha_pulls=excluded.gacha_pulls, updated_at=now()
  returning * into r;
  return r;
end;
$$;
revoke all on function public.roflix_sync_game_state(integer,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint) from public;
grant execute on function public.roflix_sync_game_state(integer,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint) to authenticated;

create or replace function public.roflix_leaderboard(p_limit integer default 50)
returns table(rank bigint,user_id uuid,display_name text,avatar_url text,level integer,exp bigint,gems bigint,episodes_watched bigint,gacha_pulls bigint,score numeric)
language sql stable security definer set search_path = public
as $$
  select row_number() over(order by coalesce(g.level,1) desc, coalesce(g.exp,0) desc, coalesce(g.episodes_watched,0) desc, coalesce(g.gems_earned,0) desc) as rank,
    p.id,p.display_name,p.avatar_url,coalesce(g.level,1),coalesce(g.exp,0),coalesce(g.gems,0),coalesce(g.episodes_watched,0),coalesce(g.gacha_pulls,0),
    (coalesce(g.level,1)*100000 + coalesce(g.exp,0) + coalesce(g.episodes_watched,0)*25 + coalesce(g.gacha_pulls,0)*5)::numeric as score
  from public.profiles p left join public.roflix_game_stats g on g.user_id=p.id
  where coalesce(p.account_status,'active')='active'
  order by coalesce(g.level,1) desc, coalesce(g.exp,0) desc, coalesce(g.episodes_watched,0) desc, coalesce(g.gems_earned,0) desc
  limit greatest(1,least(p_limit,100));
$$;
revoke all on function public.roflix_leaderboard(integer) from public;
grant execute on function public.roflix_leaderboard(integer) to anon, authenticated;

create or replace function public.roflix_gacha_commit(
  p_cost bigint,
  p_card_key text,
  p_name text,
  p_movie text,
  p_rarity text,
  p_image text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare g public.roflix_game_stats; new_gems bigint;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if p_cost < 0 then raise exception 'Invalid cost'; end if;
  insert into public.roflix_game_stats(user_id) values(auth.uid()) on conflict do nothing;
  select * into g from public.roflix_game_stats where user_id=auth.uid() for update;
  if g.gems < p_cost then raise exception 'Not enough RoGem'; end if;
  new_gems := g.gems - p_cost;
  update public.roflix_game_stats set gems=new_gems,gacha_pulls=gacha_pulls+1,updated_at=now() where user_id=auth.uid();
  insert into public.roflix_gacha_inventory(user_id,card_key,name,movie,rarity,image) values(auth.uid(),p_card_key,p_name,p_movie,p_rarity,p_image);
  return jsonb_build_object('gems',new_gems,'gacha_pulls',g.gacha_pulls+1);
end;
$$;
revoke all on function public.roflix_gacha_commit(bigint,text,text,text,text,text) from public;
grant execute on function public.roflix_gacha_commit(bigint,text,text,text,text,text) to authenticated;

create or replace function public.roflix_admin_game_stats()
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'players',(select count(*) from public.roflix_game_stats),
    'total_gacha_pulls',(select coalesce(sum(gacha_pulls),0) from public.roflix_game_stats),
    'total_episodes',(select coalesce(sum(episodes_watched),0) from public.roflix_game_stats),
    'total_gems',(select coalesce(sum(gems),0) from public.roflix_game_stats),
    'watchlist_items',(select count(*) from public.roflix_watchlist),
    'recent_gacha',(select coalesce(jsonb_agg(x order by x.obtained_at desc),'[]'::jsonb) from (select g.name,g.rarity,g.movie,g.obtained_at,p.display_name from public.roflix_gacha_inventory g left join public.profiles p on p.id=g.user_id order by g.obtained_at desc limit 20) x)
  );
end;
$$;
revoke all on function public.roflix_admin_game_stats() from public;
grant execute on function public.roflix_admin_game_stats() to authenticated;

alter table public.roflix_game_stats replica identity full;
alter table public.roflix_watchlist replica identity full;
alter table public.roflix_gacha_inventory replica identity full;
do $$
begin
  begin alter publication supabase_realtime add table public.roflix_game_stats; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.roflix_watchlist; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.roflix_gacha_inventory; exception when duplicate_object then null; end;
end $$;

-- 11.5) User-owned RoGem wallet mutation. The browser never writes an old local balance over an admin update.
drop function if exists public.roflix_user_adjust_gem(bigint);
create or replace function public.roflix_user_adjust_gem(p_delta bigint)
returns public.roflix_game_stats
language plpgsql
security definer
set search_path = public
as $$
declare g public.roflix_game_stats; v_after bigint;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if p_delta = 0 then
    select * into g from public.roflix_game_stats where user_id=auth.uid();
    if g.user_id is null then
      insert into public.roflix_game_stats(user_id) values(auth.uid()) returning * into g;
    end if;
    return g;
  end if;
  insert into public.roflix_game_stats(user_id) values(auth.uid()) on conflict (user_id) do nothing;
  select * into g from public.roflix_game_stats where user_id=auth.uid() for update;
  v_after := coalesce(g.gems,0) + p_delta;
  if v_after < 0 then raise exception 'Not enough RoGem'; end if;
  update public.roflix_game_stats
  set gems=v_after,
      gems_earned=case when p_delta > 0 then gems_earned+p_delta else gems_earned end,
      updated_at=now()
  where user_id=auth.uid()
  returning * into g;
  return g;
end;
$$;
revoke all on function public.roflix_user_adjust_gem(bigint) from public;
grant execute on function public.roflix_user_adjust_gem(bigint) to authenticated;

-- 12) Admin RoGem management + audit trail.
create table if not exists public.roflix_gem_transactions (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('add','remove','set')),
  delta bigint not null default 0,
  balance_before bigint not null default 0,
  balance_after bigint not null default 0,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists roflix_gem_tx_target_idx on public.roflix_gem_transactions(target_user_id, created_at desc);
create index if not exists roflix_gem_tx_created_idx on public.roflix_gem_transactions(created_at desc);

alter table public.roflix_gem_transactions enable row level security;
revoke all on table public.roflix_gem_transactions from anon, authenticated;
grant select on public.roflix_gem_transactions to authenticated;
drop policy if exists "admin read gem transactions" on public.roflix_gem_transactions;
create policy "admin read gem transactions" on public.roflix_gem_transactions
for select to authenticated using (public.roflix_is_admin());

drop function if exists public.roflix_admin_adjust_gem(uuid,bigint,text);
create or replace function public.roflix_admin_adjust_gem(
  p_user_id uuid,
  p_delta bigint,
  p_reason text default ''
)
returns public.roflix_game_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.roflix_game_stats;
  v_before bigint;
  v_after bigint;
  v_action text;
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_user_id is null then raise exception 'Target user is required'; end if;
  if p_delta = 0 then raise exception 'Gem change cannot be zero'; end if;
  if p_delta < 0 then v_action := 'remove'; else v_action := 'add'; end if;

  insert into public.roflix_game_stats(user_id) values(p_user_id)
  on conflict (user_id) do nothing;
  select * into g from public.roflix_game_stats where user_id=p_user_id for update;
  v_before := coalesce(g.gems,0);
  v_after := v_before + p_delta;
  if v_after < 0 then raise exception 'RoGem cannot be negative'; end if;

  update public.roflix_game_stats
  set gems=v_after,
      gems_earned=case when p_delta > 0 then gems_earned+p_delta else gems_earned end,
      updated_at=now()
  where user_id=p_user_id
  returning * into g;

  insert into public.roflix_gem_transactions(admin_id,target_user_id,action,delta,balance_before,balance_after,reason)
  values(auth.uid(),p_user_id,v_action,p_delta,v_before,v_after,left(coalesce(p_reason,''),500));

  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details)
  values(auth.uid(),'adjust_gem',p_user_id,jsonb_build_object(
    'action',v_action,'delta',p_delta,'balance_before',v_before,'balance_after',v_after,
    'reason',left(coalesce(p_reason,''),500)
  ));
  return g;
end;
$$;
revoke all on function public.roflix_admin_adjust_gem(uuid,bigint,text) from public;
grant execute on function public.roflix_admin_adjust_gem(uuid,bigint,text) to authenticated;

drop function if exists public.roflix_admin_set_gem(uuid,bigint,text);
create or replace function public.roflix_admin_set_gem(
  p_user_id uuid,
  p_balance bigint,
  p_reason text default ''
)
returns public.roflix_game_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.roflix_game_stats;
  v_before bigint;
  v_delta bigint;
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_user_id is null then raise exception 'Target user is required'; end if;
  if p_balance < 0 then raise exception 'RoGem cannot be negative'; end if;

  insert into public.roflix_game_stats(user_id) values(p_user_id)
  on conflict (user_id) do nothing;
  select * into g from public.roflix_game_stats where user_id=p_user_id for update;
  v_before := coalesce(g.gems,0);
  v_delta := p_balance-v_before;

  update public.roflix_game_stats
  set gems=p_balance,
      gems_earned=case when v_delta > 0 then gems_earned+v_delta else gems_earned end,
      updated_at=now()
  where user_id=p_user_id
  returning * into g;

  insert into public.roflix_gem_transactions(admin_id,target_user_id,action,delta,balance_before,balance_after,reason)
  values(auth.uid(),p_user_id,'set',v_delta,v_before,p_balance,left(coalesce(p_reason,''),500));

  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details)
  values(auth.uid(),'set_gem',p_user_id,jsonb_build_object(
    'delta',v_delta,'balance_before',v_before,'balance_after',p_balance,
    'reason',left(coalesce(p_reason,''),500)
  ));
  return g;
end;
$$;
revoke all on function public.roflix_admin_set_gem(uuid,bigint,text) from public;
grant execute on function public.roflix_admin_set_gem(uuid,bigint,text) to authenticated;

drop function if exists public.roflix_admin_find_game_users(text,integer);
create or replace function public.roflix_admin_find_game_users(
  p_query text default '',
  p_limit integer default 50
)
returns table(user_id uuid,display_name text,role text,email text,level integer,exp bigint,gems bigint,gems_earned bigint)
language sql
security definer
set search_path = public
as $$
  select p.id,p.display_name,p.role,u.email,coalesce(g.level,1),coalesce(g.exp,0),coalesce(g.gems,0),coalesce(g.gems_earned,0)
  from public.profiles p
  join auth.users u on u.id=p.id
  left join public.roflix_game_stats g on g.user_id=p.id
  where public.roflix_is_admin()
    and (
      nullif(trim(p_query),'') is null
      or lower(coalesce(p.display_name,'')) like '%'||lower(trim(p_query))||'%'
      or lower(coalesce(u.email,'')) like '%'||lower(trim(p_query))||'%'
      or p.id::text = trim(p_query)
    )
  order by coalesce(g.gems,0) desc, p.created_at desc
  limit greatest(1,least(coalesce(p_limit,50),200));
$$;
revoke all on function public.roflix_admin_find_game_users(text,integer) from public;
grant execute on function public.roflix_admin_find_game_users(text,integer) to authenticated;
