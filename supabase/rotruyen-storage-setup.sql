-- Run this SQL in the Supabase SQL Editor for the RoFlix/RoHub project.
-- Public read is needed for reader pages; only active admin profiles may write/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rotruyen-pages','rotruyen-pages',true,52428800,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "RoTruyen chapter images are publicly readable" on storage.objects;
create policy "RoTruyen chapter images are publicly readable" on storage.objects for select to anon, authenticated using (bucket_id='rotruyen-pages');

drop policy if exists "Active RoHub admins can upload RoTruyen images" on storage.objects;
create policy "Active RoHub admins can upload RoTruyen images" on storage.objects for insert to authenticated with check (
 bucket_id='rotruyen-pages' and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and (p.account_status is null or p.account_status='active'))
);

drop policy if exists "Active RoHub admins can update RoTruyen images" on storage.objects;
create policy "Active RoHub admins can update RoTruyen images" on storage.objects for update to authenticated using (
 bucket_id='rotruyen-pages' and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and (p.account_status is null or p.account_status='active'))
) with check (
 bucket_id='rotruyen-pages' and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and (p.account_status is null or p.account_status='active'))
);

drop policy if exists "Active RoHub admins can delete RoTruyen images" on storage.objects;
create policy "Active RoHub admins can delete RoTruyen images" on storage.objects for delete to authenticated using (
 bucket_id='rotruyen-pages' and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and (p.account_status is null or p.account_status='active'))
);
