-- ============================================================
-- RoFlix Admin Verification 1.0
-- Manual verification: Admin approves a new account.
-- Run AFTER supabase/setup.sql + supabase/admin_analytics.sql.
-- ============================================================

-- New accounts wait for Admin approval. Existing accounts keep status.
alter table public.profiles
  alter column account_status set default 'pending';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('pending','active','suspended','banned'));

-- New auth users are created as pending by the existing profile trigger.
create or replace function public.roflix_create_profile()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, role, account_status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)),
    'user',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Recreate the trigger so the new function is definitely used.
drop trigger if exists roflix_auth_user_created on auth.users;
create trigger roflix_auth_user_created
after insert on auth.users
for each row execute procedure public.roflix_create_profile();

-- Admin status RPC now accepts pending and records the action.
create or replace function public.roflix_admin_set_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('pending','active','suspended','banned') then
    raise exception 'Invalid account status';
  end if;
  if p_user_id = auth.uid() and p_status <> 'active' then
    raise exception 'You cannot disable your own account';
  end if;

  update public.profiles
  set account_status = p_status
  where id = p_user_id;

  insert into public.roflix_admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), 'set_status', p_user_id, jsonb_build_object('status', p_status));
end;
$$;

revoke all on function public.roflix_admin_set_status(uuid,text) from public;
grant execute on function public.roflix_admin_set_status(uuid,text) to authenticated;

-- Admin stats include pending accounts.
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
    'pending_total', (select count(*) from public.profiles where account_status = 'pending'),
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
    'top_movies', coalesce((select jsonb_agg(x order by x.views desc) from (select movie_slug, coalesce(max(movie_title), movie_slug) as movie_title, count(*) as views from public.roflix_site_events where event_type = 'movie_view' and created_at >= now() - interval '30 days' and movie_slug is not null group by movie_slug order by count(*) desc limit 10) x), '[]'::jsonb),
    'daily_visitors', coalesce((select jsonb_agg(x order by x.day) from (select date_trunc('day', created_at)::date as day, count(distinct session_id) as visitors, count(*) as events from public.roflix_site_events where created_at >= current_date - interval '13 days' group by 1 order by 1) x), '[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(x order by x.created_at desc) from (select event_type, session_id, user_id, page, movie_title, created_at from public.roflix_site_events order by created_at desc limit 30) x), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.roflix_admin_stats() from public;
grant execute on function public.roflix_admin_stats() to authenticated;
