create or replace function public.roflix_admin_user_sessions(p_user_id uuid)
returns table(session_id text, page text, movie_slug text, movie_title text, last_seen_at timestamptz, created_at timestamptz, device_label text, revoked_at timestamptz, revoke_reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_user_id is null then raise exception 'User required'; end if;
  return query
    select s.session_id,s.page,s.movie_slug,s.movie_title,s.last_seen_at,s.created_at,s.device_label,s.revoked_at,s.revoke_reason
      from public.roflix_active_sessions s
     where s.user_id=p_user_id
     order by s.last_seen_at desc
     limit 100;
end;
$$;
revoke all on function public.roflix_admin_user_sessions(uuid) from public;
grant execute on function public.roflix_admin_user_sessions(uuid) to authenticated;
