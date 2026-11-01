-- Watch Party 2.0: host-controlled rooms, public/private visibility, chat toggle and 10-member cap.
-- Applied to Supabase project rbbudoccewyvmbkpdfju as three ordered migrations.
alter table public.watch_rooms
  add column if not exists visibility text not null default 'private',
  add column if not exists chat_enabled boolean not null default true,
  add column if not exists max_members integer not null default 10;
alter table public.watch_rooms
  drop constraint if exists watch_rooms_visibility_check,
  add constraint watch_rooms_visibility_check check (visibility in ('private','public')),
  drop constraint if exists watch_rooms_max_members_check,
  add constraint watch_rooms_max_members_check check (max_members between 2 and 10);
alter table public.watch_room_members add column if not exists last_seen_at timestamptz not null default now();
create index if not exists watch_rooms_public_active_idx on public.watch_rooms(created_at desc) where status='active' and visibility='public';
create index if not exists watch_room_members_presence_idx on public.watch_room_members(room_id,last_seen_at desc);

create or replace function public.roflix_create_watch_room_v2(p_name text default 'Phòng xem RoFlix',p_movie_slug text default null,p_movie_title text default null,p_visibility text default 'private',p_chat_enabled boolean default true)
returns public.watch_rooms language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_room public.watch_rooms; v_code text; v_attempt integer:=0;
begin
 if v_user is null then raise exception 'Bạn cần đăng nhập để tạo phòng.'; end if;
 if p_visibility not in ('private','public') then raise exception 'Loại phòng không hợp lệ.'; end if;
 loop
  v_code:='RF-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,5));
  exit when not exists(select 1 from public.watch_rooms where code=v_code);
  v_attempt:=v_attempt+1; if v_attempt>10 then raise exception 'Không tạo được mã phòng.'; end if;
 end loop;
 insert into public.watch_rooms(code,host_id,name,movie_slug,movie_title,visibility,chat_enabled,max_members)
 values(v_code,v_user,left(coalesce(nullif(trim(p_name),''),'Phòng xem RoFlix'),120),p_movie_slug,p_movie_title,p_visibility,coalesce(p_chat_enabled,true),10)
 returning * into v_room;
 insert into public.watch_room_members(room_id,user_id,last_seen_at) values(v_room.id,v_user,now()) on conflict(room_id,user_id) do nothing;
 return v_room;
end $$;

create or replace function public.roflix_join_watch_room_v2(p_code text)
returns public.watch_rooms language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_room public.watch_rooms; v_count integer;
begin
 if v_user is null then raise exception 'Bạn cần đăng nhập để tham gia phòng.'; end if;
 select * into v_room from public.watch_rooms where code=upper(trim(p_code)) and status='active' for update;
 if not found then raise exception 'Không tìm thấy phòng hoặc phòng đã kết thúc.'; end if;
 update public.watch_room_members set last_seen_at=now() where room_id=v_room.id and user_id=v_user;
 if found then return v_room; end if;
 select count(*) into v_count from public.watch_room_members where room_id=v_room.id and last_seen_at>now()-interval '90 seconds';
 if v_count>=least(v_room.max_members,10) then raise exception 'Phòng đã đủ 10 người.'; end if;
 insert into public.watch_room_members(room_id,user_id,last_seen_at) values(v_room.id,v_user,now())
 on conflict(room_id,user_id) do update set last_seen_at=now();
 return v_room;
end $$;

create or replace function public.roflix_watch_room_heartbeat_v2(p_room_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Bạn cần đăng nhập.'; end if;
 update public.watch_room_members set last_seen_at=now() where room_id=p_room_id and user_id=v_user;
 return found;
end $$;

create or replace function public.roflix_leave_watch_room_v2(p_room_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_host uuid;
begin
 if v_user is null then raise exception 'Bạn cần đăng nhập.'; end if;
 select host_id into v_host from public.watch_rooms where id=p_room_id and status='active' for update;
 if not found then return false; end if;
 delete from public.watch_room_members where room_id=p_room_id and user_id=v_user;
 if v_host=v_user then
  update public.watch_rooms set status='ended',updated_at=now() where id=p_room_id;
  delete from public.watch_room_members where room_id=p_room_id;
 end if;
 return true;
end $$;

create or replace function public.roflix_list_public_watch_rooms_v2()
returns table(id uuid,code text,name text,movie_title text,member_count integer,max_members integer,created_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select r.id,r.code,r.name,r.movie_title,
 (select count(*)::integer from public.watch_room_members m where m.room_id=r.id and m.last_seen_at>now()-interval '90 seconds'),
 least(r.max_members,10),r.created_at
 from public.watch_rooms r where r.status='active' and r.visibility='public'
 and (select count(*) from public.watch_room_members m where m.room_id=r.id and m.last_seen_at>now()-interval '90 seconds')<least(r.max_members,10)
 order by r.created_at desc limit 30;
$$;

create or replace function public.roflix_join_watch_room(p_code text)
returns public.watch_rooms language plpgsql security definer set search_path=public,pg_temp as $$
begin return public.roflix_join_watch_room_v2(p_code); end $$;

create or replace function public.roflix_watch_room_event(p_room_id uuid,p_event_type text,p_payload jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_chat_enabled boolean;
begin
 if v_user is null then raise exception 'Bạn cần đăng nhập.'; end if;
 if p_event_type not in ('play','pause','seek','episode','sync','chat','system') then raise exception 'Loại sự kiện không hợp lệ.'; end if;
 select r.chat_enabled into v_chat_enabled from public.watch_rooms r join public.watch_room_members m on m.room_id=r.id
 where r.id=p_room_id and r.status='active' and m.user_id=v_user;
 if not found then raise exception 'Bạn không thuộc phòng này.'; end if;
 if p_event_type='chat' and not coalesce(v_chat_enabled,true) then raise exception 'Chat đã bị tắt trong phòng này.'; end if;
 insert into public.watch_room_events(room_id,user_id,event_type,payload) values(p_room_id,v_user,p_event_type,coalesce(p_payload,'{}'::jsonb));
 return true;
end $$;

revoke all on function public.roflix_create_watch_room_v2(text,text,text,text,boolean) from public,anon;
revoke all on function public.roflix_join_watch_room_v2(text) from public,anon;
revoke all on function public.roflix_leave_watch_room_v2(uuid) from public,anon;
revoke all on function public.roflix_watch_room_heartbeat_v2(uuid) from public,anon;
revoke all on function public.roflix_list_public_watch_rooms_v2() from public,anon;
revoke all on function public.roflix_join_watch_room(text) from public,anon;
revoke all on function public.roflix_watch_room_event(uuid,text,jsonb) from public,anon;
grant execute on function public.roflix_create_watch_room_v2(text,text,text,text,boolean) to authenticated;
grant execute on function public.roflix_join_watch_room_v2(text) to authenticated;
grant execute on function public.roflix_leave_watch_room_v2(uuid) to authenticated;
grant execute on function public.roflix_watch_room_heartbeat_v2(uuid) to authenticated;
grant execute on function public.roflix_list_public_watch_rooms_v2() to authenticated;
grant execute on function public.roflix_join_watch_room(text) to authenticated;
grant execute on function public.roflix_watch_room_event(uuid,text,jsonb) to authenticated;
