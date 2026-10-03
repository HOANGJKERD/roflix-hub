-- ============================================================
-- RoFlix Pro V2: Movie comments + release schedule + realtime admin
-- Run AFTER setup.sql, auth_profiles_fix.sql and admin_analytics.sql
-- ============================================================

-- 1) Movie comments shown under the player.
-- roflix_is_admin() is safe for anonymous callers and simply returns false.
grant execute on function public.roflix_is_admin() to anon;
create table if not exists public.movie_comments (
  id bigint generated always as identity primary key,
  movie_slug text not null,
  movie_title text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'RoFlix user',
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now()
);
create index if not exists movie_comments_movie_idx on public.movie_comments(movie_slug, created_at desc);
create index if not exists movie_comments_user_idx on public.movie_comments(user_id, created_at desc);

alter table public.movie_comments enable row level security;
grant select on public.movie_comments to anon, authenticated;
grant insert, update, delete on public.movie_comments to authenticated;

drop policy if exists "movie comments public visible read" on public.movie_comments;
create policy "movie comments public visible read" on public.movie_comments
for select to anon, authenticated using (status = 'visible' or public.roflix_is_admin());

drop policy if exists "movie comments own insert" on public.movie_comments;
create policy "movie comments own insert" on public.movie_comments
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "movie comments own update" on public.movie_comments;
create policy "movie comments own update" on public.movie_comments
for update to authenticated using (user_id = auth.uid() or public.roflix_is_admin()) with check (user_id = auth.uid() or public.roflix_is_admin());

drop policy if exists "movie comments own delete" on public.movie_comments;
create policy "movie comments own delete" on public.movie_comments
for delete to authenticated using (user_id = auth.uid() or public.roflix_is_admin());

-- 2) Admin-managed release calendar.
create table if not exists public.roflix_release_schedule (
  id uuid primary key default gen_random_uuid(),
  movie_slug text not null,
  title text not null,
  origin_name text not null default '',
  source_id text not null default 'kkphim' check (source_id in ('kkphim','vsmov')),
  poster_url text,
  summary text not null default '',
  note text not null default '',
  release_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','released','cancelled')),
  featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists roflix_release_schedule_release_idx on public.roflix_release_schedule(release_at asc);
create index if not exists roflix_release_schedule_status_idx on public.roflix_release_schedule(status, release_at asc);

create or replace function public.roflix_release_schedule_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roflix_release_schedule_touch on public.roflix_release_schedule;
create trigger roflix_release_schedule_touch
before update on public.roflix_release_schedule
for each row execute function public.roflix_release_schedule_touch();

alter table public.roflix_release_schedule enable row level security;
grant select on public.roflix_release_schedule to anon, authenticated;
grant insert, update, delete on public.roflix_release_schedule to authenticated;

drop policy if exists "release schedule public read" on public.roflix_release_schedule;
create policy "release schedule public read" on public.roflix_release_schedule
for select to anon, authenticated using (status in ('scheduled','released') or public.roflix_is_admin());

drop policy if exists "release schedule admin insert" on public.roflix_release_schedule;
create policy "release schedule admin insert" on public.roflix_release_schedule
for insert to authenticated with check (public.roflix_is_admin() and created_by = auth.uid());

drop policy if exists "release schedule admin update" on public.roflix_release_schedule;
create policy "release schedule admin update" on public.roflix_release_schedule
for update to authenticated using (public.roflix_is_admin()) with check (public.roflix_is_admin());

drop policy if exists "release schedule admin delete" on public.roflix_release_schedule;
create policy "release schedule admin delete" on public.roflix_release_schedule
for delete to authenticated using (public.roflix_is_admin());

-- 3) Automatically flip due releases when the site/admin checks the calendar.
create or replace function public.roflix_sync_release_schedule()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.roflix_release_schedule
  set status = 'released', released_at = coalesce(released_at, now()), updated_at = now()
  where status = 'scheduled' and release_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.roflix_sync_release_schedule() from public;
grant execute on function public.roflix_sync_release_schedule() to anon, authenticated;

-- 4) Audit schedule changes made by admins.
create or replace function public.roflix_release_schedule_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.roflix_admin_audit_logs(admin_id, action, details)
    values (
      auth.uid(),
      case when TG_OP='INSERT' then 'schedule_create' when TG_OP='UPDATE' then 'schedule_update' else 'schedule_delete' end,
      jsonb_build_object(
        'schedule_id', coalesce(NEW.id, OLD.id),
        'movie_slug', coalesce(NEW.movie_slug, OLD.movie_slug),
        'title', coalesce(NEW.title, OLD.title),
        'operation', TG_OP
      )
    );
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists roflix_release_schedule_audit on public.roflix_release_schedule;
create trigger roflix_release_schedule_audit
after insert or update or delete on public.roflix_release_schedule
for each row execute function public.roflix_release_schedule_audit();

-- 5) Audit movie comment moderation changes.
create or replace function public.roflix_movie_comment_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.roflix_is_admin() then
    if TG_OP = 'DELETE' then
      insert into public.roflix_admin_audit_logs(admin_id, action, details)
      values(auth.uid(), 'movie_comment_delete', jsonb_build_object('comment_id',OLD.id,'movie_slug',OLD.movie_slug));
    elsif TG_OP = 'UPDATE' then
      insert into public.roflix_admin_audit_logs(admin_id, action, details)
      values(auth.uid(), 'movie_comment_update', jsonb_build_object('comment_id',NEW.id,'movie_slug',NEW.movie_slug,'status',NEW.status));
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists roflix_movie_comment_audit on public.movie_comments;
create trigger roflix_movie_comment_audit
after update or delete on public.movie_comments
for each row execute function public.roflix_movie_comment_audit();

-- 6) Realtime publications for admin/live UI.
alter table public.movie_comments replica identity full;
alter table public.roflix_release_schedule replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.movie_comments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.roflix_release_schedule; exception when duplicate_object then null; end;
end $$;

-- 7) Optional view-like RPC for a richer live dashboard, with only recent sessions.
create or replace function public.roflix_admin_live_viewers()
returns table (
  session_id text,
  user_id uuid,
  page text,
  movie_slug text,
  movie_title text,
  last_seen_at timestamptz,
  is_authenticated boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  return query
  select a.session_id,a.user_id,a.page,a.movie_slug,a.movie_title,a.last_seen_at,(a.user_id is not null)
  from public.roflix_active_sessions a
  where a.last_seen_at >= now() - interval '5 minutes'
  order by a.last_seen_at desc;
end;
$$;
revoke all on function public.roflix_admin_live_viewers() from public;
grant execute on function public.roflix_admin_live_viewers() to authenticated;

-- 8) Admin schedule statistics for Dashboard 2.0.
create or replace function public.roflix_admin_schedule_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'scheduled', (select count(*) from public.roflix_release_schedule where status='scheduled'),
    'released', (select count(*) from public.roflix_release_schedule where status='released'),
    'next_release', (select jsonb_build_object('title',title,'release_at',release_at,'poster_url',poster_url) from public.roflix_release_schedule where status='scheduled' order by release_at asc limit 1)
  );
end;
$$;
revoke all on function public.roflix_admin_schedule_stats() from public;
grant execute on function public.roflix_admin_schedule_stats() to authenticated;
