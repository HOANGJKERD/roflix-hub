-- Admin-only metadata update wrapper for Drive movies.
create or replace function public.roflix_admin_drive_movie_upsert_v2(
 p_id uuid default null,
 p_slug text default null,
 p_title text default null,
 p_origin_name text default null,
 p_summary text default null,
 p_poster_url text default null,
 p_backdrop_url text default null,
 p_year int default null,
 p_quality text default 'AUTO',
 p_lang text default 'Vietsub',
 p_categories text default '[]',
 p_drive_file_id text default null,
 p_drive_share_url text default null,
 p_locked boolean default false,
 p_lock_reason text default null,
 p_published boolean default false,
 p_admin_note text default null,
 p_actors jsonb default '[]'::jsonb,
 p_directors jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare rid uuid;
begin
 if not public.roflix_is_admin() then raise exception 'admin only'; end if;
 rid := public.roflix_admin_drive_movie_upsert(
   p_id,p_slug,p_title,p_origin_name,p_summary,p_poster_url,p_backdrop_url,p_year,
   p_quality,p_lang,p_categories,p_drive_file_id,p_drive_share_url,p_locked,
   p_lock_reason,p_published,p_admin_note
 );
 update public.roflix_custom_movies
 set actors=coalesce(p_actors,'[]'::jsonb),
     directors=coalesce(p_directors,'[]'::jsonb),
     updated_at=now()
 where id=rid;
 return rid;
end; $$;
revoke all on function public.roflix_admin_drive_movie_upsert_v2(uuid,text,text,text,text,text,text,int,text,text,text,text,text,boolean,text,boolean,text,jsonb,jsonb) from public,anon;
grant execute on function public.roflix_admin_drive_movie_upsert_v2(uuid,text,text,text,text,text,text,int,text,text,text,text,text,boolean,text,boolean,text,jsonb,jsonb) to authenticated;
