-- RoFlix Google Drive shared-link source support
-- Drive is an additional source; Storage-backed custom movies remain compatible.
alter table public.roflix_custom_movies
  add column if not exists drive_file_id text,
  add column if not exists drive_share_url text,
  add column if not exists playback_mode text not null default 'storage',
  add column if not exists source_provider text not null default 'storage',
  add column if not exists drive_permission_status text not null default 'unchecked',
  add column if not exists drive_checked_at timestamptz;
alter table public.roflix_custom_movies drop constraint if exists roflix_custom_movies_playback_mode_check;
alter table public.roflix_custom_movies add constraint roflix_custom_movies_playback_mode_check check (playback_mode in ('storage','drive_preview'));
alter table public.roflix_custom_movies drop constraint if exists roflix_custom_movies_source_provider_check;
alter table public.roflix_custom_movies add constraint roflix_custom_movies_source_provider_check check (source_provider in ('storage','google_drive'));
alter table public.roflix_custom_movies drop constraint if exists roflix_custom_movies_drive_permission_status_check;
alter table public.roflix_custom_movies add constraint roflix_custom_movies_drive_permission_status_check check (drive_permission_status in ('unchecked','public_link','restricted','invalid'));
create unique index if not exists roflix_custom_movies_drive_file_id_uidx on public.roflix_custom_movies(drive_file_id) where drive_file_id is not null;

create or replace function public.roflix_admin_drive_movie_upsert(
 p_id uuid default null,p_slug text default null,p_title text default null,p_origin_name text default null,
 p_summary text default null,p_poster_url text default null,p_backdrop_url text default null,p_year int default null,
 p_quality text default 'AUTO',p_lang text default 'Vietsub',p_categories text default '[]',
 p_drive_file_id text default null,p_drive_share_url text default null,p_locked boolean default false,
 p_lock_reason text default null,p_published boolean default false,p_admin_note text default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare rid uuid;
begin
 if not public.roflix_is_admin() then raise exception 'admin only'; end if;
 if nullif(trim(p_drive_file_id),'') is null then raise exception 'Google Drive file ID is required'; end if;
 if nullif(trim(p_title),'') is null or nullif(trim(p_slug),'') is null then raise exception 'Movie title and slug are required'; end if;
 if p_id is not null then
  update public.roflix_custom_movies set slug=trim(p_slug),title=trim(p_title),origin_name=coalesce(p_origin_name,''),
   summary=coalesce(p_summary,''),poster_url=coalesce(p_poster_url,''),backdrop_url=coalesce(p_backdrop_url,''),
   year=p_year,quality=coalesce(nullif(p_quality,''),'AUTO'),lang=coalesce(nullif(p_lang,''),'Vietsub'),
   categories=public.roflix_to_jsonb(p_categories),video_path='',video_mime='text/html',
   drive_file_id=trim(p_drive_file_id),drive_share_url=trim(p_drive_share_url),playback_mode='drive_preview',
   source_provider='google_drive',drive_permission_status='unchecked',drive_checked_at=null,
   locked=coalesce(p_locked,false),lock_reason=coalesce(p_lock_reason,''),published=coalesce(p_published,false),
   admin_note=coalesce(p_admin_note,''),updated_at=now() where id=p_id returning id into rid;
  if rid is null then raise exception 'Movie not found'; end if;
  return rid;
 end if;
 insert into public.roflix_custom_movies(slug,title,origin_name,summary,poster_url,backdrop_url,categories,year,
  quality,lang,video_path,video_mime,drive_file_id,drive_share_url,playback_mode,source_provider,
  drive_permission_status,locked,lock_reason,published,admin_note,created_by,updated_at)
 values(trim(p_slug),trim(p_title),coalesce(p_origin_name,''),coalesce(p_summary,''),coalesce(p_poster_url,''),
  coalesce(p_backdrop_url,''),public.roflix_to_jsonb(p_categories),p_year,coalesce(nullif(p_quality,''),'AUTO'),
  coalesce(nullif(p_lang,''),'Vietsub'),'','text/html',trim(p_drive_file_id),trim(p_drive_share_url),
  'drive_preview','google_drive','unchecked',coalesce(p_locked,false),coalesce(p_lock_reason,''),
  coalesce(p_published,false),coalesce(p_admin_note,''),auth.uid(),now()) returning id into rid;
 return rid;
end; $$;
revoke all on function public.roflix_admin_drive_movie_upsert(uuid,text,text,text,text,text,text,int,text,text,text,text,text,boolean,text,boolean,text) from public,anon;
grant execute on function public.roflix_admin_drive_movie_upsert(uuid,text,text,text,text,text,text,int,text,text,text,text,text,boolean,text,boolean,text) to authenticated;
