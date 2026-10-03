-- RoFlix cloud favorites sync
-- Applied to Supabase project rbbudoccewyvmbkpdfju.
create table if not exists public.roflix_favorites_cloud (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_slug)
);

create index if not exists roflix_favorites_cloud_user_idx
  on public.roflix_favorites_cloud(user_id, created_at desc);

alter table public.roflix_favorites_cloud enable row level security;

create or replace function public.roflix_favorites_get()
returns jsonb
language sql security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(movie_slug order by created_at asc), '[]'::jsonb)
  from public.roflix_favorites_cloud
  where user_id = (select auth.uid());
$$;

create or replace function public.roflix_favorites_replace(p_slugs jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid()); item jsonb; slug text; count_saved integer := 0;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_slugs, '[]'::jsonb)) <> 'array' then raise exception 'p_slugs must be a JSON array'; end if;
  delete from public.roflix_favorites_cloud where user_id = uid;
  for item in select value from jsonb_array_elements(p_slugs) loop
    slug := nullif(left(trim(coalesce(item #>> '{}', '')), 300), '');
    if slug is not null then
      insert into public.roflix_favorites_cloud(user_id,movie_slug) values(uid,slug) on conflict do nothing;
      count_saved := count_saved + 1;
    end if;
  end loop;
  return jsonb_build_object('ok',true,'count',count_saved);
end;
$$;

revoke all on function public.roflix_favorites_get() from public, anon;
revoke all on function public.roflix_favorites_replace(jsonb) from public, anon;
grant execute on function public.roflix_favorites_get() to authenticated;
grant execute on function public.roflix_favorites_replace(jsonb) to authenticated;
