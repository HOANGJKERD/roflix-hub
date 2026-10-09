-- Cloud sync for RoTruyen bookmarks and reading progress across signed-in devices.
create table if not exists public.rotruyen_user_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  item_source text not null default 'unknown' check (item_source in ('database','mangadex','longbook','unknown')),
  title text not null default '',
  is_saved boolean not null default false,
  last_chapter_id text,
  last_chapter_label text,
  progress_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,item_id)
);
create index if not exists rotruyen_user_library_updated_idx on public.rotruyen_user_library(user_id,updated_at desc);
alter table public.rotruyen_user_library enable row level security;
drop policy if exists "Users manage own RoTruyen library" on public.rotruyen_user_library;
create policy "Users manage own RoTruyen library" on public.rotruyen_user_library
for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create or replace function public.rotruyen_library_touch_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists rotruyen_user_library_touch on public.rotruyen_user_library;
create trigger rotruyen_user_library_touch before update on public.rotruyen_user_library for each row execute function public.rotruyen_library_touch_updated_at();
