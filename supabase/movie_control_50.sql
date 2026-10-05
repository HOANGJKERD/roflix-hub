-- RoFlix Movie Control 5.0
-- Run in Supabase SQL Editor after setup.sql

create table if not exists public.roflix_movie_settings (
  id boolean primary key default true check (id = true),
  lock_18_plus boolean not null default true,
  force_login_for_locked boolean not null default true,
  force_site_login boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.roflix_movie_settings(id, lock_18_plus, force_login_for_locked, force_site_login)
values (true, true, true, true)
on conflict (id) do nothing;

create table if not exists public.roflix_movie_overrides (
  id uuid primary key default gen_random_uuid(),
  source_id text not null check (source_id in ('kkphim','vsmov')),
  movie_slug text not null,
  hidden boolean not null default false,
  locked boolean not null default false,
  lock_reason text,
  title text,
  origin_name text,
  summary text,
  poster_url text,
  backdrop_url text,
  actors jsonb not null default '[]'::jsonb,
  directors jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  year int,
  quality text,
  lang text,
  trailer_url text,
  preferred_source_id text check (preferred_source_id is null or preferred_source_id in ('kkphim','vsmov')),
  episodes jsonb not null default '[]'::jsonb,
  admin_note text,
  updated_at timestamptz not null default now(),
  unique (source_id, movie_slug)
);

create table if not exists public.roflix_custom_movies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  origin_name text,
  summary text,
  poster_url text,
  backdrop_url text,
  actors jsonb not null default '[]'::jsonb,
  directors jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  year int,
  quality text default 'HD',
  lang text default 'Vietsub',
  trailer_url text,
  video_path text,
  video_mime text default 'video/mp4',
  locked boolean not null default false,
  lock_reason text,
  published boolean not null default true,
  admin_note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.roflix_movie_settings enable row level security;
alter table public.roflix_movie_overrides enable row level security;
alter table public.roflix_custom_movies enable row level security;

drop policy if exists "movie settings read" on public.roflix_movie_settings;
create policy "movie settings read" on public.roflix_movie_settings
for select to anon, authenticated using (true);

drop policy if exists "movie overrides read" on public.roflix_movie_overrides;
create policy "movie overrides read" on public.roflix_movie_overrides
for select to anon, authenticated using (true);

drop policy if exists "custom movies read published" on public.roflix_custom_movies;
create policy "custom movies read published" on public.roflix_custom_movies
for select to anon, authenticated using (published = true or public.roflix_is_admin());

create or replace function public.roflix_to_jsonb(p text)
returns jsonb language plpgsql immutable as $$
begin
  if p is null or btrim(p) = '' then return '[]'::jsonb; end if;
  begin
    return p::jsonb;
  exception when others then
    return to_jsonb(ARRAY(select btrim(x) from unnest(string_to_array(p, ',')) as x where btrim(x) <> ''));
  end;
end;
$$;

create or replace function public.roflix_admin_movie_settings_update(
  p_lock_18_plus boolean,
  p_force_login boolean,
  p_force_site_login boolean default true
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.roflix_is_admin() then raise exception 'admin only'; end if;
  insert into public.roflix_movie_settings(id, lock_18_plus, force_login_for_locked, force_site_login, updated_at)
  values (true, coalesce(p_lock_18_plus,true), coalesce(p_force_login,true), coalesce(p_force_site_login,true), now())
  on conflict (id) do update set
    lock_18_plus = excluded.lock_18_plus,
    force_login_for_locked = excluded.force_login_for_locked,
    force_site_login = excluded.force_site_login,
    updated_at = now();
end;
$$;
grant execute on function public.roflix_admin_movie_settings_update(boolean,boolean,boolean) to authenticated;

create or replace function public.roflix_admin_movie_override_upsert(
  p_source_id text,
  p_movie_slug text,
  p_hidden boolean default false,
  p_locked boolean default false,
  p_lock_reason text default null,
  p_title text default null,
  p_origin_name text default null,
  p_summary text default null,
  p_poster_url text default null,
  p_backdrop_url text default null,
  p_actors text default '[]',
  p_directors text default '[]',
  p_categories text default '[]',
  p_year int default null,
  p_quality text default null,
  p_lang text default null,
  p_trailer_url text default null,
  p_preferred_source_id text default null,
  p_episodes jsonb default '[]'::jsonb,
  p_admin_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not public.roflix_is_admin() then raise exception 'admin only'; end if;
  insert into public.roflix_movie_overrides as t (
    source_id, movie_slug, hidden, locked, lock_reason, title, origin_name, summary,
    poster_url, backdrop_url, actors, directors, categories, year, quality, lang,
    trailer_url, preferred_source_id, episodes, admin_note, updated_at
  ) values (
    p_source_id, trim(p_movie_slug), coalesce(p_hidden,false), coalesce(p_locked,false), p_lock_reason,
    p_title, p_origin_name, p_summary, p_poster_url, p_backdrop_url,
    public.roflix_to_jsonb(p_actors), public.roflix_to_jsonb(p_directors), public.roflix_to_jsonb(p_categories),
    p_year, p_quality, p_lang, p_trailer_url, nullif(p_preferred_source_id,''),
    coalesce(p_episodes, '[]'::jsonb), p_admin_note, now()
  )
  on conflict (source_id, movie_slug) do update set
    hidden = excluded.hidden, locked = excluded.locked, lock_reason = excluded.lock_reason,
    title = excluded.title, origin_name = excluded.origin_name, summary = excluded.summary,
    poster_url = excluded.poster_url, backdrop_url = excluded.backdrop_url,
    actors = excluded.actors, directors = excluded.directors, categories = excluded.categories,
    year = excluded.year, quality = excluded.quality, lang = excluded.lang,
    trailer_url = excluded.trailer_url, preferred_source_id = excluded.preferred_source_id,
    episodes = excluded.episodes, admin_note = excluded.admin_note, updated_at = now()
  returning id into rid;
  return rid;
end;
$$;
grant execute on function public.roflix_admin_movie_override_upsert(
  text,text,boolean,boolean,text,text,text,text,text,text,text,text,text,int,text,text,text,text,jsonb,text
) to authenticated;

create or replace function public.roflix_admin_movie_override_delete(p_source_id text, p_movie_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.roflix_is_admin() then raise exception 'admin only'; end if;
  delete from public.roflix_movie_overrides where source_id = p_source_id and movie_slug = p_movie_slug;
end;
$$;
grant execute on function public.roflix_admin_movie_override_delete(text,text) to authenticated;

create or replace function public.roflix_admin_custom_movie_upsert(
  p_id uuid default null,
  p_slug text default null,
  p_title text default null,
  p_origin_name text default null,
  p_summary text default null,
  p_poster_url text default null,
  p_backdrop_url text default null,
  p_actors text default '[]',
  p_directors text default '[]',
  p_categories text default '[]',
  p_year int default null,
  p_quality text default 'HD',
  p_lang text default 'Vietsub',
  p_trailer_url text default null,
  p_video_path text default null,
  p_video_mime text default 'video/mp4',
  p_locked boolean default false,
  p_lock_reason text default null,
  p_published boolean default true,
  p_admin_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not public.roflix_is_admin() then raise exception 'admin only'; end if;
  if p_id is not null then
    update public.roflix_custom_movies set
      slug = coalesce(nullif(trim(p_slug),''), slug),
      title = coalesce(nullif(trim(p_title),''), title),
      origin_name = p_origin_name, summary = p_summary, poster_url = p_poster_url,
      backdrop_url = p_backdrop_url,
      actors = public.roflix_to_jsonb(p_actors),
      directors = public.roflix_to_jsonb(p_directors),
      categories = public.roflix_to_jsonb(p_categories),
      year = p_year, quality = coalesce(p_quality,'HD'), lang = coalesce(p_lang,'Vietsub'),
      trailer_url = p_trailer_url,
      video_path = coalesce(p_video_path, video_path),
      video_mime = coalesce(p_video_mime, video_mime),
      locked = coalesce(p_locked,false), lock_reason = p_lock_reason,
      published = coalesce(p_published,true), admin_note = p_admin_note, updated_at = now()
    where id = p_id returning id into rid;
    return rid;
  end if;
  insert into public.roflix_custom_movies(
    slug,title,origin_name,summary,poster_url,backdrop_url,actors,directors,categories,
    year,quality,lang,trailer_url,video_path,video_mime,locked,lock_reason,published,admin_note,created_by,updated_at
  ) values (
    trim(p_slug), trim(p_title), p_origin_name, p_summary, p_poster_url, p_backdrop_url,
    public.roflix_to_jsonb(p_actors), public.roflix_to_jsonb(p_directors), public.roflix_to_jsonb(p_categories),
    p_year, coalesce(p_quality,'HD'), coalesce(p_lang,'Vietsub'),
    p_trailer_url, p_video_path, coalesce(p_video_mime,'video/mp4'), coalesce(p_locked,false), p_lock_reason,
    coalesce(p_published,true), p_admin_note, auth.uid(), now()
  ) returning id into rid;
  return rid;
end;
$$;
grant execute on function public.roflix_admin_custom_movie_upsert(
  uuid,text,text,text,text,text,text,text,text,text,int,text,text,text,text,text,boolean,text,boolean,text
) to authenticated;

create or replace function public.roflix_admin_custom_movie_delete(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.roflix_is_admin() then raise exception 'admin only'; end if;
  delete from public.roflix_custom_movies where id = p_id;
end;
$$;
grant execute on function public.roflix_admin_custom_movie_delete(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('roflix-media', 'roflix-media', false)
on conflict (id) do nothing;

drop policy if exists "roflix media admin write" on storage.objects;
create policy "roflix media admin write" on storage.objects
for all to authenticated
using (bucket_id = 'roflix-media' and public.roflix_is_admin())
with check (bucket_id = 'roflix-media' and public.roflix_is_admin());

drop policy if exists "roflix media signed read" on storage.objects;
create policy "roflix media signed read" on storage.objects
for select to authenticated
using (bucket_id = 'roflix-media');
