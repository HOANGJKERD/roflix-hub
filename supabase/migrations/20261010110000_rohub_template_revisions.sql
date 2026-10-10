-- Safe template publish/rollback history for RoHub.
create table if not exists public.rohub_template_revisions (
 id uuid primary key default gen_random_uuid(),
 template_id uuid not null references public.rohub_templates(id) on delete cascade,
 version integer not null,
 name text not null,
 slug text not null,
 target_app text not null,
 template_type text not null,
 description text not null default '',
 config jsonb not null,
 status text not null,
 action text not null check(action in ('publish','rollback','snapshot')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(template_id,version)
);
create index if not exists roh_template_revisions_lookup_idx on public.rohub_template_revisions(template_id,version desc);
alter table public.rohub_template_revisions enable row level security;
drop policy if exists "rohub_template_revisions_admin_select" on public.rohub_template_revisions;
create policy "rohub_template_revisions_admin_select" on public.rohub_template_revisions for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "rohub_template_revisions_admin_insert" on public.rohub_template_revisions;
create policy "rohub_template_revisions_admin_insert" on public.rohub_template_revisions for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active') and (created_by is null or created_by=auth.uid()));
grant select,insert on public.rohub_template_revisions to authenticated;
