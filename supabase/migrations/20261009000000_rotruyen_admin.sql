-- RoTruyen admin schema. Apply via Supabase SQL Editor before enabling admin writes.
-- All mutation policies require an active profile with role='admin'.
create table if not exists public.rotruyen_series (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 240),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  synopsis text not null default '',
  cover_url text not null default '',
  author text not null default '',
  source_key text not null default 'manual' check (source_key in ('manual','mangadex','longbook')),
  source_id text,
  genres text[] not null default '{}',
  content_rating text not null default 'safe' check (content_rating in ('safe','suggestive','erotica')),
  status text not null default 'ongoing' check (status in ('ongoing','completed','hiatus','cancelled')),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.rotruyen_chapters (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.rotruyen_series(id) on delete cascade,
  chapter_number numeric(10,2) not null,
  title text not null default '',
  external_url text not null default '',
  page_manifest jsonb not null default '[]'::jsonb check (jsonb_typeof(page_manifest)='array'),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, chapter_number)
);
create table if not exists public.rotruyen_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,80}$'),
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.rotruyen_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rotruyen_series_published_idx on public.rotruyen_series(is_published,sort_order,updated_at desc);
create index if not exists rotruyen_series_source_idx on public.rotruyen_series(source_key,source_id);
create index if not exists rotruyen_chapters_series_idx on public.rotruyen_chapters(series_id,chapter_number);
create index if not exists rotruyen_audit_created_idx on public.rotruyen_audit_logs(created_at desc);
create or replace function public.rotruyen_touch_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists rotruyen_series_touch on public.rotruyen_series;
create trigger rotruyen_series_touch before update on public.rotruyen_series for each row execute function public.rotruyen_touch_updated_at();
drop trigger if exists rotruyen_chapters_touch on public.rotruyen_chapters;
create trigger rotruyen_chapters_touch before update on public.rotruyen_chapters for each row execute function public.rotruyen_touch_updated_at();
drop trigger if exists rotruyen_settings_touch on public.rotruyen_settings;
create trigger rotruyen_settings_touch before update on public.rotruyen_settings for each row execute function public.rotruyen_touch_updated_at();
alter table public.rotruyen_series enable row level security;
alter table public.rotruyen_chapters enable row level security;
alter table public.rotruyen_settings enable row level security;
alter table public.rotruyen_audit_logs enable row level security;
drop policy if exists "Public can read published RoTruyen series" on public.rotruyen_series;
create policy "Public can read published RoTruyen series" on public.rotruyen_series for select to anon, authenticated using (is_published or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Active admins manage RoTruyen series" on public.rotruyen_series;
create policy "Active admins manage RoTruyen series" on public.rotruyen_series for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Public can read published RoTruyen chapters" on public.rotruyen_chapters;
create policy "Public can read published RoTruyen chapters" on public.rotruyen_chapters for select to anon, authenticated using ((is_published and exists(select 1 from public.rotruyen_series s where s.id=series_id and s.is_published)) or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Active admins manage RoTruyen chapters" on public.rotruyen_chapters;
create policy "Active admins manage RoTruyen chapters" on public.rotruyen_chapters for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Public can read RoTruyen public settings" on public.rotruyen_settings;
create policy "Public can read RoTruyen public settings" on public.rotruyen_settings for select to anon, authenticated using (key like 'public.%' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Active admins manage RoTruyen settings" on public.rotruyen_settings;
create policy "Active admins manage RoTruyen settings" on public.rotruyen_settings for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Only active admins read RoTruyen audit logs" on public.rotruyen_audit_logs;
create policy "Only active admins read RoTruyen audit logs" on public.rotruyen_audit_logs for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Active admins write RoTruyen audit logs" on public.rotruyen_audit_logs;
create policy "Active admins write RoTruyen audit logs" on public.rotruyen_audit_logs for insert to authenticated with check (actor_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
grant select on public.rotruyen_series, public.rotruyen_chapters, public.rotruyen_settings to anon, authenticated;
grant insert,update,delete on public.rotruyen_series, public.rotruyen_chapters, public.rotruyen_settings to authenticated;
grant select,insert on public.rotruyen_audit_logs to authenticated;
grant usage,select on sequence public.rotruyen_audit_logs_id_seq to authenticated;
insert into public.rotruyen_settings(key,value) values
('public.branding','{"title":"RoTruyện","accent":"#a78bfa","showRanking":true,"cardsPerRow":6}'::jsonb),
('public.reader','{"maxWidth":900,"background":"#0b0d13","fit":"width","showChapterTitle":true}'::jsonb),
('public.sources','{"mangadex":{"enabled":true,"priority":1},"longbook":{"enabled":false,"baseUrl":""}}'::jsonb)
on conflict(key) do nothing;
