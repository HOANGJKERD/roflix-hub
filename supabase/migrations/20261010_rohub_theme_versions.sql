-- RoHub Studio: versioned theme/template configuration.
-- Run in Supabase SQL Editor or your migration pipeline before using Save/Publish.
create table if not exists public.rohub_theme_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target text not null check (target in ('both','roflix','rotruyen')),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  version_number integer not null check (version_number > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(target, version_number)
);
create index if not exists rohub_theme_versions_target_status_version_idx
  on public.rohub_theme_versions(target, status, version_number desc);
alter table public.rohub_theme_versions enable row level security;
drop policy if exists "Admins can read RoHub theme versions" on public.rohub_theme_versions;
create policy "Admins can read RoHub theme versions" on public.rohub_theme_versions
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and coalesce(p.account_status,'active') = 'active')
);
drop policy if exists "Admins can insert RoHub theme versions" on public.rohub_theme_versions;
create policy "Admins can insert RoHub theme versions" on public.rohub_theme_versions
for insert to authenticated with check (
  created_by = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and coalesce(p.account_status,'active') = 'active')
);
drop policy if exists "Admins can update RoHub theme versions" on public.rohub_theme_versions;
create policy "Admins can update RoHub theme versions" on public.rohub_theme_versions
for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and coalesce(p.account_status,'active') = 'active')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and coalesce(p.account_status,'active') = 'active')
);
-- Public clients may only read the published runtime configuration.
drop policy if exists "Public can read published RoHub theme versions" on public.rohub_theme_versions;
create policy "Public can read published RoHub theme versions" on public.rohub_theme_versions
for select to anon, authenticated using (status = 'published');
