-- Allow authenticated members to submit their own RoTruyen series and chapters.
-- Community submissions are drafts and require admin approval before appearing publicly.
drop policy if exists "Members can submit own RoTruyen series" on public.rotruyen_series;
create policy "Members can submit own RoTruyen series"
on public.rotruyen_series for insert to authenticated
with check (
  created_by = auth.uid()
  and is_published = false
  and exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.account_status,'active')='active')
);
drop policy if exists "Members can read own RoTruyen series" on public.rotruyen_series;
create policy "Members can read own RoTruyen series"
on public.rotruyen_series for select to authenticated
using (
  created_by = auth.uid()
  or (is_published and (content_rating <> 'erotica' or auth.uid() is not null))
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active')
);
drop policy if exists "Members can update own unpublished RoTruyen series" on public.rotruyen_series;
create policy "Members can update own unpublished RoTruyen series"
on public.rotruyen_series for update to authenticated
using (created_by=auth.uid() and is_published=false)
with check (created_by=auth.uid() and is_published=false);
drop policy if exists "Members can delete own unpublished RoTruyen series" on public.rotruyen_series;
create policy "Members can delete own unpublished RoTruyen series"
on public.rotruyen_series for delete to authenticated
using (created_by=auth.uid() and is_published=false);

drop policy if exists "Members can read own RoTruyen chapters" on public.rotruyen_chapters;
create policy "Members can read own RoTruyen chapters"
on public.rotruyen_chapters for select to authenticated
using (
  exists(select 1 from public.rotruyen_series s where s.id=series_id and s.created_by=auth.uid())
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and coalesce(p.account_status,'active')='active')
);
drop policy if exists "Members can submit chapters to own RoTruyen series" on public.rotruyen_chapters;
create policy "Members can submit chapters to own RoTruyen series"
on public.rotruyen_chapters for insert to authenticated
with check (
  is_published=false
  and exists(select 1 from public.rotruyen_series s where s.id=series_id and s.created_by=auth.uid())
  and exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.account_status,'active')='active')
);
drop policy if exists "Members can update own unpublished RoTruyen chapters" on public.rotruyen_chapters;
create policy "Members can update own unpublished RoTruyen chapters"
on public.rotruyen_chapters for update to authenticated
using (is_published=false and exists(select 1 from public.rotruyen_series s where s.id=series_id and s.created_by=auth.uid()))
with check (is_published=false and exists(select 1 from public.rotruyen_series s where s.id=series_id and s.created_by=auth.uid()));
drop policy if exists "Members can delete own unpublished RoTruyen chapters" on public.rotruyen_chapters;
create policy "Members can delete own unpublished RoTruyen chapters"
on public.rotruyen_chapters for delete to authenticated
using (is_published=false and exists(select 1 from public.rotruyen_series s where s.id=series_id and s.created_by=auth.uid()));
