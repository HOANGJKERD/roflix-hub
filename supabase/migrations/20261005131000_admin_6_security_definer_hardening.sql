-- Pin SECURITY DEFINER functions to an empty search_path per Supabase guidance.

create or replace function public.roflix_admin_set_account_control(p_user_id uuid,p_status text,p_suspend_minutes integer default null,p_reason text default '') returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare v_row public.profiles; v_until timestamptz; v_old_status text;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_user_id is null or p_user_id = auth.uid() then raise exception 'Không thể tự khóa tài khoản admin hiện tại'; end if;
  if p_status not in ('active','suspended','banned') then raise exception 'Invalid account status'; end if;
  if p_suspend_minutes is not null and (p_suspend_minutes < 1 or p_suspend_minutes > 43200) then raise exception 'Invalid suspension duration'; end if;
  select account_status into v_old_status from public.profiles where id=p_user_id for update;
  if not found then raise exception 'User not found'; end if;
  if p_status='suspended' and p_suspend_minutes is not null then v_until := now() + make_interval(mins=>p_suspend_minutes); else v_until := null; end if;
  update public.profiles set account_status=p_status,suspended_until=v_until,security_version=security_version+1,admin_note=left(coalesce(p_reason,''),1000) where id=p_user_id returning * into v_row;
  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details) values(auth.uid(),'account_control',p_user_id,jsonb_build_object('new_status',p_status,'suspended_until',v_until,'reason',left(coalesce(p_reason,''),1000)));
  insert into public.roflix_admin_control_events(event_type,target_user_id,payload,created_by) values('account_status_changed',p_user_id,jsonb_build_object('status',p_status,'suspended_until',v_until,'reason',left(coalesce(p_reason,''),1000)),auth.uid());
  return v_row;
end; $$;

create or replace function public.roflix_admin_revoke_sessions(p_user_id uuid,p_session_id text default null,p_reason text default 'Admin force logout') returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_user_id is null then raise exception 'User required'; end if;
  update public.roflix_active_sessions set revoked_at=now(),revoke_reason=left(coalesce(p_reason,''),500) where user_id=p_user_id and revoked_at is null and (p_session_id is null or session_id=p_session_id);
  get diagnostics v_count=row_count;
  update public.profiles set security_version=security_version+1 where id=p_user_id;
  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details) values(auth.uid(),'force_logout',p_user_id,jsonb_build_object('session_id',p_session_id,'revoked_count',v_count,'reason',left(coalesce(p_reason,''),500)));
  insert into public.roflix_admin_control_events(event_type,target_user_id,target_session_id,payload,created_by) values('force_logout',p_user_id,p_session_id,jsonb_build_object('revoked_count',v_count,'reason',left(coalesce(p_reason,''),500)),auth.uid());
  return v_count;
end; $$;

create or replace function public.roflix_admin_set_feature_flag(p_key text,p_enabled boolean,p_config jsonb default '{}'::jsonb) returns public.roflix_admin_feature_flags
language plpgsql security definer set search_path = ''
as $$
declare v_row public.roflix_admin_feature_flags;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_key is null or length(trim(p_key))<2 or length(trim(p_key))>80 then raise exception 'Invalid feature key'; end if;
  insert into public.roflix_admin_feature_flags(key,enabled,config,updated_by,updated_at) values(trim(p_key),coalesce(p_enabled,false),coalesce(p_config,'{}'::jsonb),auth.uid(),now()) on conflict(key) do update set enabled=excluded.enabled,config=excluded.config,updated_by=excluded.updated_by,updated_at=now() returning * into v_row;
  insert into public.roflix_admin_audit_logs(admin_id,action,details) values(auth.uid(),'feature_flag_changed',jsonb_build_object('key',v_row.key,'enabled',v_row.enabled,'config',v_row.config));
  insert into public.roflix_admin_control_events(event_type,payload,created_by) values('feature_flag_changed',jsonb_build_object('key',v_row.key,'enabled',v_row.enabled,'config',v_row.config),auth.uid());
  return v_row;
end; $$;

create or replace function public.roflix_admin_live_ops() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  select jsonb_build_object('active_sessions',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and revoked_at is null),'watching_sessions',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and revoked_at is null and movie_slug is not null and movie_slug<>''),'authenticated_sessions',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and revoked_at is null and user_id is not null),'events_5m',(select count(*) from public.roflix_site_events where created_at>=now()-interval '5 minutes'),'errors_5m',(select count(*) from public.roflix_site_events where created_at>=now()-interval '5 minutes' and event_type in ('error','playback_error','api_error')),'restricted_users',(select count(*) from public.profiles where account_status in ('suspended','banned')),'last_event_at',(select max(created_at) from public.roflix_site_events),'last_control_event_at',(select max(created_at) from public.roflix_admin_control_events)) into result;
  return result;
end; $$;

create or replace function public.roflix_admin_security_feed(p_limit integer default 80) returns table(id bigint,action text,target_user_id uuid,details jsonb,created_at timestamptz,admin_id uuid)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  return query select l.id,l.action,l.target_user_id,l.details,l.created_at,l.admin_id from public.roflix_admin_audit_logs l order by l.created_at desc limit least(greatest(coalesce(p_limit,80),1),250);
end; $$;

create or replace function public.roflix_admin_user_sessions(p_user_id uuid) returns table(session_id text,page text,movie_slug text,movie_title text,last_seen_at timestamptz,created_at timestamptz,device_label text,revoked_at timestamptz,revoke_reason text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_user_id is null then raise exception 'User required'; end if;
  return query select s.session_id,s.page,s.movie_slug,s.movie_title,s.last_seen_at,s.created_at,s.device_label,s.revoked_at,s.revoke_reason from public.roflix_active_sessions s where s.user_id=p_user_id order by s.last_seen_at desc limit 100;
end; $$;
