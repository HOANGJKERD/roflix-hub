-- Persistent RoHub Template Builder storage.
create table if not exists public.rohub_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),
  target_app text not null default 'both' check (target_app in ('roflix','rotruyen','both')),
  template_type text not null default 'page' check (template_type in ('header','footer','homepage','page','series','reader','login','register','search','category','tag','author','404')),
  description text not null default '',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists roh_templates_app_type_status_idx on public.rohub_templates(target_app, template_type, status);
create index if not exists roh_templates_updated_at_idx on public.rohub_templates(updated_at desc);
alter table public.rohub_templates enable row level security;
drop policy if exists "rohub_templates_admin_select" on public.rohub_templates;
create policy "rohub_templates_admin_select" on public.rohub_templates for select to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "rohub_templates_admin_insert" on public.rohub_templates;
create policy "rohub_templates_admin_insert" on public.rohub_templates for insert to authenticated with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active') and (created_by is null or created_by=auth.uid()) and (updated_by is null or updated_by=auth.uid()));
drop policy if exists "rohub_templates_admin_update" on public.rohub_templates;
create policy "rohub_templates_admin_update" on public.rohub_templates for update to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active')) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active') and (updated_by is null or updated_by=auth.uid()));
drop policy if exists "rohub_templates_admin_delete" on public.rohub_templates;
create policy "rohub_templates_admin_delete" on public.rohub_templates for delete to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active'));
grant select,insert,update,delete on public.rohub_templates to authenticated;
create or replace function public.rohub_templates_touch_updated_at() returns trigger language plpgsql set search_path=public as $$
begin
 new.updated_at=now();
 if tg_op='UPDATE' then new.version=old.version+1; end if;
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then new.published_at=now(); end if;
 if new.status<>'published' then new.published_at=null; end if;
 return new;
end; $$;
drop trigger if exists roh_templates_touch_updated_at on public.rohub_templates;
create trigger roh_templates_touch_updated_at before insert or update on public.rohub_templates for each row execute function public.rohub_templates_touch_updated_at();
