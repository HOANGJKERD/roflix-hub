-- RoFlix multi-episode Google Drive support
create table if not exists public.roflix_custom_movie_episodes (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.roflix_custom_movies(id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  episode_name text not null,
  drive_file_id text not null,
  drive_share_url text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(movie_id, episode_number)
);
create index if not exists roflix_custom_movie_episodes_movie_idx
  on public.roflix_custom_movie_episodes(movie_id, episode_number);
alter table public.roflix_custom_movie_episodes enable row level security;
drop policy if exists "Published drive episodes are readable" on public.roflix_custom_movie_episodes;
create policy "Published drive episodes are readable"
  on public.roflix_custom_movie_episodes for select to anon, authenticated
  using (published = true or public.roflix_is_admin());
drop policy if exists "Admins manage drive episodes" on public.roflix_custom_movie_episodes;
create policy "Admins manage drive episodes"
  on public.roflix_custom_movie_episodes for all to authenticated
  using (public.roflix_is_admin()) with check (public.roflix_is_admin());
grant select on public.roflix_custom_movie_episodes to anon, authenticated;
grant insert, update, delete on public.roflix_custom_movie_episodes to authenticated;
