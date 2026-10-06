-- Canonical movie comments contract: public.roflix_movie_comments
-- Does not drop movie_comments / community_comments.

begin;

create table if not exists public.roflix_movie_comments (
  id uuid primary key default gen_random_uuid(),
  movie_slug text not null,
  movie_title text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'Khán Giả',
  display_name text not null default 'Khán Giả',
  body text not null,
  parent_id uuid,
  status text not null default 'visible',
  created_at timestamptz not null default now()
);

alter table public.roflix_movie_comments add column if not exists username text;
alter table public.roflix_movie_comments add column if not exists display_name text;
alter table public.roflix_movie_comments add column if not exists parent_id uuid;
alter table public.roflix_movie_comments add column if not exists status text;
alter table public.roflix_movie_comments add column if not exists movie_title text;
alter table public.roflix_movie_comments add column if not exists movie_slug text;
alter table public.roflix_movie_comments add column if not exists user_id uuid;
alter table public.roflix_movie_comments add column if not exists body text;
alter table public.roflix_movie_comments add column if not exists created_at timestamptz;

update public.roflix_movie_comments
  set username = coalesce(nullif(username, ''), nullif(display_name, ''), 'Khán Giả')
  where username is null or username = '';
update public.roflix_movie_comments
  set display_name = coalesce(nullif(display_name, ''), nullif(username, ''), 'Khán Giả')
  where display_name is null or display_name = '';
update public.roflix_movie_comments
  set status = 'visible'
  where status is null or status not in ('visible', 'hidden');

create index if not exists roflix_movie_comments_movie_idx
  on public.roflix_movie_comments(movie_slug, created_at desc);
create index if not exists roflix_movie_comments_user_idx
  on public.roflix_movie_comments(user_id, created_at desc);

alter table public.roflix_movie_comments enable row level security;
alter table public.roflix_movie_comments replica identity full;

create table if not exists public.roflix_movie_comment_moderation (
  comment_id uuid primary key,
  status text not null default 'hidden',
  reason text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.roflix_movie_comment_moderation enable row level security;

create table if not exists public.roflix_movie_comment_likes (
  comment_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.roflix_movie_comment_likes enable row level security;

revoke all on table public.roflix_movie_comments from anon, authenticated;
grant select, insert, update, delete on table public.roflix_movie_comments to authenticated;
grant select on table public.roflix_movie_comments to anon;

drop policy if exists "roflix comments public read" on public.roflix_movie_comments;
create policy "roflix comments public read" on public.roflix_movie_comments
for select to anon, authenticated
using (coalesce(status, 'visible') = 'visible' or user_id = auth.uid() or public.roflix_is_admin());

drop policy if exists "roflix comments own insert" on public.roflix_movie_comments;
create policy "roflix comments own insert" on public.roflix_movie_comments
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "roflix comments own update" on public.roflix_movie_comments;
create policy "roflix comments own update" on public.roflix_movie_comments
for update to authenticated
using (user_id = auth.uid() or public.roflix_is_admin())
with check (user_id = auth.uid() or public.roflix_is_admin());

drop policy if exists "roflix comments own delete" on public.roflix_movie_comments;
create policy "roflix comments own delete" on public.roflix_movie_comments
for delete to authenticated
using (user_id = auth.uid() or public.roflix_is_admin());

revoke all on table public.roflix_movie_comment_moderation from anon, authenticated;
grant select on table public.roflix_movie_comment_moderation to authenticated;
drop policy if exists "roflix comment mod read" on public.roflix_movie_comment_moderation;
create policy "roflix comment mod read" on public.roflix_movie_comment_moderation
for select to authenticated using (true);

revoke all on table public.roflix_movie_comment_likes from anon, authenticated;
grant select, insert, delete on table public.roflix_movie_comment_likes to authenticated;
drop policy if exists "roflix comment likes read" on public.roflix_movie_comment_likes;
create policy "roflix comment likes read" on public.roflix_movie_comment_likes
for select to authenticated using (true);
drop policy if exists "roflix comment likes own write" on public.roflix_movie_comment_likes;
create policy "roflix comment likes own write" on public.roflix_movie_comment_likes
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "roflix comment likes own delete" on public.roflix_movie_comment_likes;
create policy "roflix comment likes own delete" on public.roflix_movie_comment_likes
for delete to authenticated using (user_id = auth.uid());

create or replace function public.roflix_movie_comment_create(
  p_movie_slug text,
  p_movie_title text default '',
  p_body text default '',
  p_parent_id text default null
)
returns public.roflix_movie_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  u uuid := auth.uid();
  uname text;
  row public.roflix_movie_comments;
  parent uuid;
begin
  if u is null then raise exception 'Login required'; end if;
  if nullif(trim(coalesce(p_movie_slug, '')), '') is null then raise exception 'Movie slug required'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 1 or char_length(p_body) > 3000 then
    raise exception 'Invalid comment body';
  end if;
  select coalesce(nullif(display_name, ''), split_part(coalesce(email, 'Khán Giả'), '@', 1), 'Khán Giả')
    into uname
    from public.profiles
    where id = u;
  uname := left(coalesce(uname, 'Khán Giả'), 80);
  begin
    if nullif(trim(coalesce(p_parent_id, '')), '') is not null then
      parent := p_parent_id::uuid;
    end if;
  exception when others then
    parent := null;
  end;
  insert into public.roflix_movie_comments(
    movie_slug, movie_title, user_id, username, display_name, body, parent_id, status
  ) values (
    left(trim(p_movie_slug), 300),
    left(coalesce(p_movie_title, p_movie_slug), 300),
    u,
    uname,
    uname,
    trim(p_body),
    parent,
    'visible'
  ) returning * into row;
  return row;
end;
$$;

create or replace function public.roflix_movie_comment_like(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u uuid := auth.uid();
  exists_like boolean;
begin
  if u is null then raise exception 'Login required'; end if;
  if nullif(trim(coalesce(p_id, '')), '') is null then raise exception 'Comment required'; end if;
  select exists(
    select 1 from public.roflix_movie_comment_likes
    where comment_id::text = p_id and user_id = u
  ) into exists_like;
  if exists_like then
    delete from public.roflix_movie_comment_likes where comment_id::text = p_id and user_id = u;
    return jsonb_build_object('liked', false);
  end if;
  insert into public.roflix_movie_comment_likes(comment_id, user_id)
    values (p_id::uuid, u)
    on conflict do nothing;
  return jsonb_build_object('liked', true);
end;
$$;

create or replace function public.roflix_admin_movie_comment_status(p_id text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_status not in ('visible', 'hidden') then raise exception 'Invalid status'; end if;
  update public.roflix_movie_comments
    set status = p_status
    where id::text = p_id;
  insert into public.roflix_movie_comment_moderation(comment_id, status, updated_by)
    values (p_id::uuid, p_status, auth.uid())
    on conflict (comment_id) do update
      set status = excluded.status, updated_by = excluded.updated_by, updated_at = now();
  return true;
end;
$$;

create or replace function public.roflix_admin_movie_comment_delete(p_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  delete from public.roflix_movie_comments where id::text = p_id;
  delete from public.roflix_movie_comment_moderation where comment_id::text = p_id;
  return true;
end;
$$;

revoke all on function public.roflix_movie_comment_create(text, text, text, text) from public, anon;
grant execute on function public.roflix_movie_comment_create(text, text, text, text) to authenticated;

revoke all on function public.roflix_movie_comment_like(text) from public, anon;
grant execute on function public.roflix_movie_comment_like(text) to authenticated;

revoke all on function public.roflix_admin_movie_comment_status(text, text) from public, anon;
grant execute on function public.roflix_admin_movie_comment_status(text, text) to authenticated;

revoke all on function public.roflix_admin_movie_comment_delete(text) from public, anon;
grant execute on function public.roflix_admin_movie_comment_delete(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.roflix_movie_comments;
exception when duplicate_object then
  null;
when undefined_object then
  null;
end $$;

commit;
