-- RoFlix watch-time and completion analytics.
create table if not exists public.roflix_watch_metrics (
 session_id text not null,
 movie_slug text not null,
 movie_title text,
 user_id uuid,
 watched_seconds integer not null default 0 check (watched_seconds>=0),
 duration_seconds integer,
 completed boolean not null default false,
 first_watched_at timestamptz not null default now(),
 last_watched_at timestamptz not null default now(),
 primary key(session_id,movie_slug)
);
create index if not exists roflix_watch_metrics_movie_idx on public.roflix_watch_metrics(movie_slug);
create index if not exists roflix_watch_metrics_last_idx on public.roflix_watch_metrics(last_watched_at desc);
alter table public.roflix_watch_metrics enable row level security;
revoke all on public.roflix_watch_metrics from anon,authenticated;
create or replace function public.roflix_record_watch_progress(p_session_id text,p_movie_slug text,p_movie_title text,p_seconds integer,p_duration_seconds integer default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_seconds integer:=greatest(0,least(coalesce(p_seconds,0),30)); v_duration integer:=case when p_duration_seconds between 1 and 86400 then p_duration_seconds else null end; v_result jsonb;
begin
 if p_session_id is null or length(trim(p_session_id))<8 or p_movie_slug is null or length(trim(p_movie_slug))=0 then raise exception 'Invalid watch session'; end if;
 insert into public.roflix_watch_metrics(session_id,movie_slug,movie_title,user_id,watched_seconds,duration_seconds,completed,last_watched_at)
 values(left(trim(p_session_id),160),left(trim(p_movie_slug),300),left(p_movie_title,300),auth.uid(),v_seconds,v_duration,false,now())
 on conflict(session_id,movie_slug) do update set movie_title=coalesce(excluded.movie_title,roflix_watch_metrics.movie_title),user_id=coalesce(auth.uid(),roflix_watch_metrics.user_id),watched_seconds=least(roflix_watch_metrics.watched_seconds+v_seconds,86400),duration_seconds=coalesce(excluded.duration_seconds,roflix_watch_metrics.duration_seconds),completed=case when coalesce(excluded.duration_seconds,roflix_watch_metrics.duration_seconds) is not null then (roflix_watch_metrics.watched_seconds+v_seconds)>=coalesce(excluded.duration_seconds,roflix_watch_metrics.duration_seconds)*0.9 else false end,last_watched_at=now();
 select jsonb_build_object('watched_seconds',watched_seconds,'duration_seconds',duration_seconds,'completed',completed) into v_result from public.roflix_watch_metrics where session_id=left(trim(p_session_id),160) and movie_slug=left(trim(p_movie_slug),300);
 return v_result;
end; $$;
revoke all on function public.roflix_record_watch_progress(text,text,text,integer,integer) from public;
grant execute on function public.roflix_record_watch_progress(text,text,text,integer,integer) to anon,authenticated;
create or replace function public.roflix_admin_watch_metrics()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb;
begin
 if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 select jsonb_build_object('total_watch_seconds',(select coalesce(sum(watched_seconds),0) from public.roflix_watch_metrics),'completed_sessions',(select count(*) from public.roflix_watch_metrics where completed),'completion_rate',(select round(100.0*count(*) filter(where completed)/nullif(count(*),0),1) from public.roflix_watch_metrics),'top_watch_time',(select coalesce(jsonb_agg(x order by x.seconds desc),'[]'::jsonb) from (select movie_slug,max(movie_title) movie_title,sum(watched_seconds) seconds,count(*) sessions,count(*) filter(where completed) completed from public.roflix_watch_metrics group by movie_slug order by sum(watched_seconds) desc limit 10) x),'top_completed',(select coalesce(jsonb_agg(x order by x.completed desc),'[]'::jsonb) from (select movie_slug,max(movie_title) movie_title,count(*) filter(where completed) completed,count(*) sessions from public.roflix_watch_metrics group by movie_slug order by count(*) filter(where completed) desc limit 10) x)) into v;
 return v;
end; $$;
revoke all on function public.roflix_admin_watch_metrics() from public,anon;
grant execute on function public.roflix_admin_watch_metrics() to authenticated;
