-- RoFlix Hub Supabase schema and Row Level Security
-- Run this entire script in Supabase Dashboard > SQL Editor > New query.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_title text not null check (char_length(movie_title) between 1 and 160),
  rating int not null default 5 check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 3000),
  display_name text not null default 'RoFlix user' check (char_length(display_name) <= 40),
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx on public.community_posts(created_at desc);
create index if not exists community_posts_user_id_idx on public.community_posts(user_id);

create or replace function public.roflix_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.roflix_is_admin() from public;
grant execute on function public.roflix_is_admin() to authenticated;

create or replace function public.roflix_create_profile()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, role)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists roflix_auth_user_created on auth.users;
create trigger roflix_auth_user_created
after insert on auth.users
for each row execute procedure public.roflix_create_profile();

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;

grant select, insert, update, delete on public.community_posts to authenticated;
grant select, update on public.profiles to authenticated;

-- Users can read their own profile; admins can read all profiles.
drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.roflix_is_admin());

-- Profile updates: user may update only their display_name; role remains admin-controlled.
-- Prevent users from changing their own role through the public API.
create or replace function public.roflix_protect_profile_role()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.roflix_is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists roflix_profile_role_guard on public.profiles;
create trigger roflix_profile_role_guard
before update on public.profiles
for each row execute procedure public.roflix_protect_profile_role();

drop policy if exists "profiles update own display name" on public.profiles;
create policy "profiles update own display name" on public.profiles
for update to authenticated
using (id = auth.uid() or public.roflix_is_admin())
with check (id = auth.uid() or public.roflix_is_admin());

-- Everyone signed in can read visible posts; admins can also read hidden posts.
drop policy if exists "read visible posts or admin" on public.community_posts;
create policy "read visible posts or admin" on public.community_posts
for select to authenticated using (status = 'visible' or public.roflix_is_admin());

-- Authenticated users may insert only as themselves, with visible status.
drop policy if exists "users insert own visible post" on public.community_posts;
create policy "users insert own visible post" on public.community_posts
for insert to authenticated with check (user_id = auth.uid() and status = 'visible');

-- Authors can edit/delete their own posts; admins can moderate any post.
drop policy if exists "authors or admin update posts" on public.community_posts;
create policy "authors or admin update posts" on public.community_posts
for update to authenticated using (user_id = auth.uid() or public.roflix_is_admin())
with check (user_id = auth.uid() or public.roflix_is_admin());

drop policy if exists "authors or admin delete posts" on public.community_posts;
create policy "authors or admin delete posts" on public.community_posts
for delete to authenticated using (user_id = auth.uid() or public.roflix_is_admin());

-- IMPORTANT: after a user signs up, grant the first admin manually from SQL Editor.
-- Replace USER_UUID with that account's auth.users id, then run this separately:
-- update public.profiles set role = 'admin' where id = 'USER_UUID';
