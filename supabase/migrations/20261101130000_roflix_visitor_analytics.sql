-- RoFlix visitor analytics: include anonymous traffic and expose admin-only watch history.
-- Existing site_events and active_sessions tables are retained.
create or replace function public.roflix_admin_watch_history(p_limit integer default 200)
returns table(event_id bigint,created_at timestamptz,event_type text,session_id text,user_id uuid,user_email text,display_name text,movie_slug text,movie_title text,page text)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 return query select e.id,e.created_at,e.event_type,e.session_id,e.user_id,u.email::text,p.display_name,e.movie_slug,e.movie_title,e.page
 from public.roflix_site_events e left join auth.users u on u.id=e.user_id left join public.profiles p on p.id=e.user_id
 where e.event_type in ('movie_view','movie_play','movie_detail','page_view') order by e.created_at desc
 limit greatest(1,least(coalesce(p_limit,200),500));
end; $$;
revoke all on function public.roflix_admin_watch_history(integer) from public,anon;
grant execute on function public.roflix_admin_watch_history(integer) to authenticated;

create or replace function public.roflix_admin_stats()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; today_start timestamptz:=date_trunc('day',now());
begin
 if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
 select jsonb_build_object(
 'users_total',(select count(*) from public.profiles),'admins_total',(select count(*) from public.profiles where role='admin'),
 'suspended_total',(select count(*) from public.profiles where account_status='suspended'),'banned_total',(select count(*) from public.profiles where account_status='banned'),
 'events_total',(select count(*) from public.roflix_site_events),'events_today',(select count(*) from public.roflix_site_events where created_at>=today_start),
 'visitors_today',(select count(distinct session_id) from public.roflix_site_events where created_at>=today_start),
 'registered_viewers_today',(select count(distinct user_id) from public.roflix_site_events where created_at>=today_start and user_id is not null),
 'movie_views_today',(select count(*) from public.roflix_site_events where event_type='movie_view' and created_at>=today_start),
 'movie_plays_today',(select count(*) from public.roflix_site_events where event_type='movie_play' and created_at>=today_start),
 'active_now',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes'),
 'active_authenticated_now',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and user_id is not null),
 'top_movies',(select coalesce(jsonb_agg(x order by x.views desc),'[]'::jsonb) from (select movie_slug,coalesce(max(movie_title),movie_slug) movie_title,count(*) views from public.roflix_site_events where event_type='movie_view' and movie_slug is not null group by movie_slug order by count(*) desc limit 10) x),
 'top_movies_30d',(select coalesce(jsonb_agg(x order by x.views desc),'[]'::jsonb) from (select movie_slug,coalesce(max(movie_title),movie_slug) movie_title,count(*) views from public.roflix_site_events where event_type='movie_view' and created_at>=now()-interval '30 days' and movie_slug is not null group by movie_slug order by count(*) desc limit 10) x),
 'daily_visitors',(select coalesce(jsonb_agg(x order by x.day_date),'[]'::jsonb) from (select date_trunc('day',created_at)::date as day_date,count(distinct session_id) visitors,count(*) events from public.roflix_site_events where created_at>=current_date-interval '13 days' group by 1 order by 1) x),
 'recent_events',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) from (select event_type,session_id,user_id,page,movie_title,created_at from public.roflix_site_events order by created_at desc limit 30) x)
 ) into result;
 return result;
end; $$;
revoke all on function public.roflix_admin_stats() from public,anon;
grant execute on function public.roflix_admin_stats() to authenticated;
