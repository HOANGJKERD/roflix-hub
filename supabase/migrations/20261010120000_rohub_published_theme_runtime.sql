-- Public runtime reads only explicitly published templates. Drafts stay private.
create table if not exists public.rohub_published_themes (
 id uuid primary key default gen_random_uuid(),
 target_app text not null check(target_app in ('roflix','rotruyen')),
 template_type text not null,
 template_id uuid not null references public.rohub_templates(id) on delete restrict,
 template_version integer not null,
 name text not null,
 slug text not null,
 config jsonb not null default '{}'::jsonb,
 published_by uuid references auth.users(id) on delete set null,
 published_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(target_app,template_type)
);
create index if not exists roh_published_themes_lookup_idx on public.rohub_published_themes(target_app,template_type);
alter table public.rohub_published_themes enable row level security;
drop policy if exists "rohub_published_themes_public_read" on public.rohub_published_themes;
create policy "rohub_published_themes_public_read" on public.rohub_published_themes for select to anon,authenticated using (true);
drop policy if exists "rohub_published_themes_admin_insert" on public.rohub_published_themes;
create policy "rohub_published_themes_admin_insert" on public.rohub_published_themes for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active') and (published_by is null or published_by=auth.uid()));
drop policy if exists "rohub_published_themes_admin_update" on public.rohub_published_themes;
create policy "rohub_published_themes_admin_update" on public.rohub_published_themes for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active') and (published_by is null or published_by=auth.uid()));
drop policy if exists "rohub_published_themes_admin_delete" on public.rohub_published_themes;
create policy "rohub_published_themes_admin_delete" on public.rohub_published_themes for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
grant select on public.rohub_published_themes to anon,authenticated;
grant insert,update,delete on public.rohub_published_themes to authenticated;
