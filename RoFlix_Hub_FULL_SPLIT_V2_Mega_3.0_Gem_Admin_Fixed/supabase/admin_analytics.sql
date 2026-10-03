-- ============================================================
-- RoFlix Admin Analytics + User Control
-- Run AFTER the base RoFlix Supabase setup.
-- ============================================================

-- 1) Extend profiles with account status / last activity.
alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active','suspended','banned'));

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_idx on public.profiles(last_seen_at desc);

-- 2) Analytics events. This stores anonymous/session and authenticated activity.
create table if not exists public.roflix_site_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'page_view','movie_view','movie_play','movie_detail','search','heartbeat','login','signup','logout'
  )),
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  page text,
  movie_slug text,
  movie_title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists roflix_site_events_created_idx on public.roflix_site_events(created_at desc);
create index if not exists roflix_site_events_type_idx on public.roflix_site_events(event_type, created_at desc);
create index if not exists roflix_site_events_session_idx on public.roflix_site_events(session_id, created_at desc);
create index if not exists roflix_site_events_movie_idx on public.roflix_site_events(movie_slug, created_at desc);
create index if not exists roflix_site_events_user_idx on public.roflix_site_events(user_id, created_at desc);

-- 3) Short-lived active sessions. Admin counts sessions whose heartbeat is < 5 minutes old.
create table if not exists public.roflix_active_sessions (
  session_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  page text,
  movie_slug text,
  movie_title text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists roflix_active_sessions_seen_idx on public.roflix_active_sessions(last_seen_at desc);
create index if not exists roflix_active_sessions_user_idx on public.roflix_active_sessions(user_id);

-- 4) Admin audit log.
create table if not exists public.roflix_admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists roflix_admin_audit_created_idx on public.roflix_admin_audit_logs(created_at desc);

-- 5) Safe helper: only an authenticated user can report their own user id.
create or replace function public.roflix_track_event(
  p_event_type text,
  p_session_id text,
  p_page text default null,
  p_movie_slug text default null,
  p_movie_title text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if p_event_type not in ('page_view','movie_view','movie_play','movie_detail','search','heartbeat','login','signup','logout') then
    raise exception 'Invalid analytics event type';
  end if;
  if p_session_id is null or length(trim(p_session_id)) < 8 then
    raise exception 'Invalid session id';
  end if;

  insert into public.roflix_site_events(event_type, session_id, user_id, page, movie_slug, movie_title, metadata)
  values (p_event_type, trim(p_session_id), v_user_id, left(p_page,200), left(p_movie_slug,300), left(p_movie_title,300), coalesce(p_metadata,'{}'::jsonb));

  if v_user_id is not null then
    update public.profiles
    set last_seen_at = now()
    where id = v_user_id;
  end if;
end;
$$;

revoke all on function public.roflix_track_event(text,text,text,text,text,jsonb) from public;
grant execute on function public.roflix_track_event(text,text,text,text,text,jsonb) to anon, authenticated;

-- 6) Heartbeat upsert. Anonymous users are allowed to create a session row, but cannot set user_id manually.
create or replace function public.roflix_heartbeat(
  p_session_id text,
  p_page text default null,
  p_movie_slug text default null,
  p_movie_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if p_session_id is null or length(trim(p_session_id)) < 8 then
    raise exception 'Invalid session id';
  end if;

  insert into public.roflix_active_sessions(session_id, user_id, page, movie_slug, movie_title, last_seen_at)
  values (trim(p_session_id), v_user_id, left(p_page,200), left(p_movie_slug,300), left(p_movie_title,300), now())
  on conflict (session_id) do update set
    user_id = excluded.user_id,
    page = excluded.page,
    movie_slug = excluded.movie_slug,
    movie_title = excluded.movie_title,
    last_seen_at = now();

  if v_user_id is not null then
    update public.profiles set last_seen_at = now() where id = v_user_id;
  end if;
end;
$$;

revoke all on function public.roflix_heartbeat(text,text,text,text) from public;
grant execute on function public.roflix_heartbeat(text,text,text,text) to anon, authenticated;

-- 7) Admin-only directory, including email from auth.users.
create or replace function public.roflix_admin_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  account_status text,
  created_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    p.role,
    p.account_status,
    p.created_at,
    p.last_seen_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.roflix_admin_users() from public;
grant execute on function public.roflix_admin_users() to authenticated;

-- 8) Admin dashboard aggregate stats.
create or replace function public.roflix_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  today_start timestamptz := date_trunc('day', now());
begin
  if not public.roflix_is_admin() then
    raise exception 'Admin access required';
  end if;

  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'admins_total', (select count(*) from public.profiles where role = 'admin'),
    'suspended_total', (select count(*) from public.profiles where account_status = 'suspended'),
    'banned_total', (select count(*) from public.profiles where account_status = 'banned'),
    'events_total', (select count(*) from public.roflix_site_events),
    'events_today', (select count(*) from public.roflix_site_events where created_at >= today_start),
    'visitors_today', (select count(distinct session_id) from public.roflix_site_events where created_at >= today_start),
    'registered_viewers_today', (select count(distinct user_id) from public.roflix_site_events where created_at >= today_start and user_id is not null),
    'movie_views_today', (select count(*) from public.roflix_site_events where event_type = 'movie_view' and created_at >= today_start),
    'movie_plays_today', (select count(*) from public.roflix_site_events where event_type = 'movie_play' and created_at >= today_start),
    'active_now', (select count(*) from public.roflix_active_sessions where last_seen_at >= now() - interval '5 minutes'),
    'active_authenticated_now', (select count(*) from public.roflix_active_sessions where last_seen_at >= now() - interval '5 minutes' and user_id is not null),
    'top_movies', coalesce((
      select jsonb_agg(x order by x.views desc)
      from (
        select movie_slug, coalesce(max(movie_title), movie_slug) as movie_title, count(*) as views
        from public.roflix_site_events
        where event_type = 'movie_view'
          and created_at >= now() - interval '30 days'
          and movie_slug is not null
        group by movie_slug
        order by count(*) desc
        limit 10
      ) x
    ), '[]'::jsonb),
    'daily_visitors', coalesce((
      select jsonb_agg(x order by x.day)
      from (
        select date_trunc('day', created_at)::date as day, count(distinct session_id) as visitors, count(*) as events
        from public.roflix_site_events
        where created_at >= current_date - interval '13 days'
        group by 1
        order by 1
      ) x
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(x order by x.created_at desc)
      from (
        select event_type, session_id, user_id, page, movie_title, created_at
        from public.roflix_site_events
        order by created_at desc
        limit 30
      ) x
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.roflix_admin_stats() from public;
grant execute on function public.roflix_admin_stats() to authenticated;

-- 9) Admin user controls.
create or replace function public.roflix_admin_set_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_role not in ('user','admin') then raise exception 'Invalid role'; end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then raise exception 'You cannot remove your own admin role'; end if;

  update public.profiles set role = p_role where id = p_user_id;
  insert into public.roflix_admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), 'set_role', p_user_id, jsonb_build_object('role',p_role));
end;
$$;

create or replace function public.roflix_admin_set_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('active','suspended','banned') then raise exception 'Invalid account status'; end if;
  if p_user_id = auth.uid() and p_status <> 'active' then raise exception 'You cannot disable your own account'; end if;

  update public.profiles set account_status = p_status where id = p_user_id;
  insert into public.roflix_admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), 'set_status', p_user_id, jsonb_build_object('status',p_status));
end;
$$;

revoke all on function public.roflix_admin_set_role(uuid,text) from public;
revoke all on function public.roflix_admin_set_status(uuid,text) from public;
grant execute on function public.roflix_admin_set_role(uuid,text) to authenticated;
grant execute on function public.roflix_admin_set_status(uuid,text) to authenticated;

-- 10) RLS. Analytics tables are intentionally not directly readable by normal users.
alter table public.roflix_site_events enable row level security;
alter table public.roflix_active_sessions enable row level security;
alter table public.roflix_admin_audit_logs enable row level security;

revoke all on table public.roflix_site_events from anon, authenticated;
revoke all on table public.roflix_active_sessions from anon, authenticated;
revoke all on table public.roflix_admin_audit_logs from anon, authenticated;
grant select on table public.roflix_site_events to authenticated;
grant select on table public.roflix_active_sessions to authenticated;
grant select on table public.roflix_admin_audit_logs to authenticated;

drop policy if exists "admin read analytics events" on public.roflix_site_events;
create policy "admin read analytics events" on public.roflix_site_events
for select to authenticated using (public.roflix_is_admin());

drop policy if exists "admin read active sessions" on public.roflix_active_sessions;
create policy "admin read active sessions" on public.roflix_active_sessions
for select to authenticated using (public.roflix_is_admin());

drop policy if exists "admin read audit logs" on public.roflix_admin_audit_logs;
create policy "admin read audit logs" on public.roflix_admin_audit_logs
for select to authenticated using (public.roflix_is_admin());

-- 11) Cleanup sessions older than 24h when called by admin.
create or replace function public.roflix_admin_cleanup_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  delete from public.roflix_active_sessions where last_seen_at < now() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.roflix_admin_cleanup_sessions() from public;
grant execute on function public.roflix_admin_cleanup_sessions() to authenticated;

-- Optional Realtime for live admin dashboard refresh.
alter table public.roflix_site_events replica identity full;
alter table public.roflix_active_sessions replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.roflix_site_events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.roflix_active_sessions;
  exception when duplicate_object then null;
  end;
end $$;
