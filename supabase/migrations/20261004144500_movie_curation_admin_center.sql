create table if not exists public.roflix_movie_curation (
  id uuid primary key default gen_random_uuid(),
  source_id text not null check (source_id in ('kkphim','vsmov','custom')),
  movie_slug text not null,
  movie_title text not null,
  origin_name text not null default '',
  poster_url text not null default '',
  year integer,
  type_key text not null default 'phim-le',
  list_keys text[] not null default '{}',
  genre_keys text[] not null default '{}',
  source_genres text[] not null default '{}',
  quality text not null default '',
  lang text not null default '',
  status text not null default '',
  auto_suggested boolean not null default false,
  curated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, movie_slug)
);

create index if not exists roflix_movie_curation_list_keys_gin on public.roflix_movie_curation using gin (list_keys);
create index if not exists roflix_movie_curation_genre_keys_gin on public.roflix_movie_curation using gin (genre_keys);
create index if not exists roflix_movie_curation_updated_idx on public.roflix_movie_curation (updated_at desc);

alter table public.roflix_movie_curation enable row level security;

drop policy if exists "roflix_movie_curation_public_read" on public.roflix_movie_curation;
create policy "roflix_movie_curation_public_read" on public.roflix_movie_curation for select using (true);

create or replace function public.roflix_admin_movie_curation_upsert(
  p_source_id text,p_movie_slug text,p_movie_title text,p_origin_name text,p_poster_url text,
  p_year integer,p_type_key text,p_list_keys text[],p_genre_keys text[],p_source_genres text[],
  p_quality text,p_lang text,p_status text,p_auto_suggested boolean
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  clean_lists text[] := array(select distinct v from unnest(coalesce(p_list_keys,'{}')) v where v <> '');
  clean_genres text[] := array(select distinct v from unnest(coalesce(p_genre_keys,'{}')) v where v <> '');
  clean_source_genres text[] := array(select distinct v from unnest(coalesce(p_source_genres,'{}')) v where v <> '');
  allowed_lists constant text[] := array['phim-moi','phim-le','phim-bo','dang-chieu','4k','long-tieng','thuyet-minh','subteam'];
  allowed_genres constant text[] := array[
    'chinh-kich','hai','bi-an','gia-dinh','hanh-dong','vien-tuong','hinh-su','kinh-di',
    'phieu-luu','khoa-hoc-vien-tuong','co-trang','vo-thuat','lang-man','gia-tuong',
    'chien-tranh','hoc-duong','hoat-hinh','tam-ly','hai-huoc','tinh-cam','tai-lieu',
    'am-nhac','the-thao','than-thoai','kinh-dien','chieu-rap','tre-em','phim-18-plus',
    'lich-su','mien-tay','phim-ngan','tv-shows','short-drama','action','fantasy'
  ];
begin
  if not roflix_is_admin() then raise exception 'Admin only'; end if;
  if p_source_id not in ('kkphim','vsmov','custom') then raise exception 'Invalid movie source'; end if;
  if nullif(trim(p_movie_slug),'') is null then raise exception 'Movie slug is required'; end if;
  if nullif(trim(p_movie_title),'') is null then raise exception 'Movie title is required'; end if;
  if exists(select 1 from unnest(clean_lists) v where not (v = any(allowed_lists))) then raise exception 'Invalid list category'; end if;
  if exists(select 1 from unnest(clean_genres) v where not (v = any(allowed_genres))) then raise exception 'Invalid genre'; end if;
  insert into public.roflix_movie_curation(
    source_id,movie_slug,movie_title,origin_name,poster_url,year,type_key,list_keys,genre_keys,
    source_genres,quality,lang,status,auto_suggested,curated_by,updated_at
  ) values (
    p_source_id,trim(p_movie_slug),left(trim(p_movie_title),250),left(coalesce(trim(p_origin_name),''),250),
    left(coalesce(trim(p_poster_url),''),2000),p_year,coalesce(nullif(trim(p_type_key),''),'phim-le'),
    clean_lists,clean_genres,clean_source_genres,left(coalesce(trim(p_quality),''),80),
    left(coalesce(trim(p_lang),''),160),left(coalesce(trim(p_status),''),80),
    coalesce(p_auto_suggested,false),auth.uid(),now()
  )
  on conflict (source_id,movie_slug) do update set
    movie_title=excluded.movie_title,origin_name=excluded.origin_name,poster_url=excluded.poster_url,
    year=excluded.year,type_key=excluded.type_key,list_keys=excluded.list_keys,genre_keys=excluded.genre_keys,
    source_genres=excluded.source_genres,quality=excluded.quality,lang=excluded.lang,status=excluded.status,
    auto_suggested=excluded.auto_suggested,curated_by=auth.uid(),updated_at=now();
  return jsonb_build_object('success',true,'source_id',p_source_id,'movie_slug',trim(p_movie_slug),'list_keys',clean_lists,'genre_keys',clean_genres);
end; $$;

create or replace function public.roflix_admin_movie_curation_delete(p_source_id text,p_movie_slug text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not roflix_is_admin() then raise exception 'Admin only'; end if;
  delete from public.roflix_movie_curation where source_id=p_source_id and movie_slug=p_movie_slug;
  return jsonb_build_object('success',true);
end; $$;

revoke all on function public.roflix_admin_movie_curation_upsert(text,text,text,text,text,integer,text,text[],text[],text[],text,text,text,boolean) from public;
revoke all on function public.roflix_admin_movie_curation_delete(text,text) from public;
grant execute on function public.roflix_admin_movie_curation_upsert(text,text,text,text,text,integer,text,text[],text[],text[],text,text,text,boolean) to authenticated;
grant execute on function public.roflix_admin_movie_curation_delete(text,text) to authenticated;