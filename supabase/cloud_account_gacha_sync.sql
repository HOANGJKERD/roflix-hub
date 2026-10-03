-- ============================================================
-- ROFLIX CLOUD ACCOUNT + GEM + GACHA + WATCH HISTORY SYNC
-- Run once in Supabase SQL Editor.
-- Uses authenticated-user RPCs so browser clients never receive
-- service-role privileges.
-- ============================================================

alter table public.profiles
  add column if not exists gems bigint not null default 0,
  add column if not exists profile_data jsonb not null default '{}'::jsonb;

create table if not exists public.roflix_gacha_inventory_cloud (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_key text not null,
  base_id text not null,
  card_data jsonb not null default '{}'::jsonb,
  obtained_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, card_key)
);

create index if not exists roflix_gacha_inventory_cloud_user_idx
  on public.roflix_gacha_inventory_cloud(user_id, obtained_at desc);

create table if not exists public.roflix_watch_history_cloud (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  history_data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create index if not exists roflix_watch_history_cloud_user_idx
  on public.roflix_watch_history_cloud(user_id, updated_at desc);

alter table public.roflix_gacha_inventory_cloud enable row level security;
alter table public.roflix_watch_history_cloud enable row level security;

-- Direct table access is intentionally closed. The app talks through RPCs.
revoke all on table public.roflix_gacha_inventory_cloud from anon, authenticated;
revoke all on table public.roflix_watch_history_cloud from anon, authenticated;

-- ------------------------------------------------------------
-- GEM BALANCE
-- ------------------------------------------------------------
create or replace function public.roflix_user_adjust_gem(p_delta bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_balance bigint;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id, display_name, role, gems)
  values (uid, 'Người dùng', 'user', 0)
  on conflict (id) do nothing;

  update public.profiles
     set gems = greatest(0, coalesce(public.profiles.gems, 0) + coalesce(p_delta, 0))
   where public.profiles.id = uid
   returning public.profiles.gems into new_balance;

  return jsonb_build_object('gems', coalesce(new_balance, 0));
end;
$$;

create or replace function public.roflix_user_get_gem()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'gems', coalesce(p.gems, 0),
    'user_id', p.id
  )
  from public.profiles p
  where p.id = (select auth.uid());
$$;

-- ------------------------------------------------------------
-- PROFILE CLOUD COPY
-- ------------------------------------------------------------
create or replace function public.roflix_profile_get()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'gems', coalesce(p.gems, 0),
    'display_name', p.display_name,
    'role', p.role,
    'profile_data', coalesce(p.profile_data, '{}'::jsonb)
  )
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.roflix_profile_sync(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result jsonb;
  safe_name text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  safe_name := nullif(left(coalesce(p_profile->>'name', ''), 120), '');

  insert into public.profiles (id, display_name, role, gems, profile_data)
  values (
    uid,
    coalesce(safe_name, 'Người dùng'),
    'user',
    0,
    coalesce(p_profile, '{}'::jsonb)
  )
  on conflict (id) do update
    set display_name = coalesce(safe_name, public.profiles.display_name),
        profile_data = coalesce(p_profile, '{}'::jsonb);

  select jsonb_build_object(
    'gems', coalesce(p.gems, 0),
    'display_name', p.display_name,
    'role', p.role,
    'profile_data', coalesce(p.profile_data, '{}'::jsonb)
  ) into result
  from public.profiles p
  where p.id = uid;

  return result;
end;
$$;

-- ------------------------------------------------------------
-- GACHA CLOUD INVENTORY
-- ------------------------------------------------------------
create or replace function public.roflix_gacha_merge(p_cards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  item jsonb;
  base_id text;
  card_key text;
  obtained timestamptz;
  inserted_count integer := 0;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_cards, '[]'::jsonb)) <> 'array' then
    raise exception 'p_cards must be a JSON array';
  end if;

  for item in select value from jsonb_array_elements(p_cards) loop
    base_id := nullif(coalesce(item->>'baseId', item->>'id'), '');
    obtained := coalesce((item->>'obtainedAt')::timestamptz, now());
    card_key := coalesce(
      nullif(item->>'cloudKey', ''),
      md5(coalesce(base_id, '') || '|' || obtained::text || '|' || coalesce(item->>'image', ''))
    );

    if base_id is null then
      continue;
    end if;

    insert into public.roflix_gacha_inventory_cloud
      (user_id, card_key, base_id, card_data, obtained_at)
    values
      (uid, card_key, base_id, item, obtained)
    on conflict (user_id, card_key) do nothing;

    if found then
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'inserted', inserted_count
  );
end;
$$;

create or replace function public.roflix_gacha_get()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(i.card_data order by i.obtained_at asc),
    '[]'::jsonb
  )
  from public.roflix_gacha_inventory_cloud i
  where i.user_id = (select auth.uid());
$$;

create or replace function public.roflix_gacha_sell(p_card_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  card jsonb;
  reward bigint;
  base_id text;
  rarity text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select i.card_data, i.base_id
    into card, base_id
    from public.roflix_gacha_inventory_cloud i
   where i.user_id = uid
     and i.card_key = p_card_key
   for update;

  if card is null then
    raise exception 'Gacha card not found';
  end if;

  rarity := coalesce(card->>'rarity', 'common');
  reward := case rarity
    when 'common' then 10
    when 'rare' then 20
    when 'super-rare' then 40
    when 'epic' then 80
    when 'legendary' then 150
    when 'secret' then 300
    else 10
  end;

  delete from public.roflix_gacha_inventory_cloud
   where user_id = uid and card_key = p_card_key;

  update public.profiles
     set gems = greatest(0, coalesce(gems, 0) + reward)
   where id = uid;

  return jsonb_build_object(
    'ok', true,
    'reward', reward,
    'base_id', base_id,
    'gems', (select gems from public.profiles where id = uid)
  );
end;
$$;

-- ------------------------------------------------------------
-- WATCH HISTORY CLOUD
-- ------------------------------------------------------------
create or replace function public.roflix_watch_history_sync(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  item jsonb;
  safe_slug text;
  incoming_ts bigint;
  merged_count integer := 0;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    safe_slug := nullif(item->>'slug', '');
    incoming_ts := greatest(0, coalesce((item->>'timestamp')::bigint, 0));
    if safe_slug is null then continue; end if;

    insert into public.roflix_watch_history_cloud
      (user_id, slug, history_data, updated_at)
    values
      (uid, safe_slug, item, incoming_ts)
    on conflict (user_id, slug) do update
      set history_data = excluded.history_data,
          updated_at = excluded.updated_at
      where excluded.updated_at >= public.roflix_watch_history_cloud.updated_at;

    merged_count := merged_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'merged', merged_count);
end;
$$;

create or replace function public.roflix_watch_history_get()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(h.history_data order by h.updated_at asc),
    '[]'::jsonb
  )
  from public.roflix_watch_history_cloud h
  where h.user_id = (select auth.uid());
$$;

-- Only signed-in users may call these functions.
revoke execute on function public.roflix_user_adjust_gem(bigint) from public, anon;
revoke execute on function public.roflix_user_get_gem() from public, anon;
revoke execute on function public.roflix_profile_get() from public, anon;
revoke execute on function public.roflix_profile_sync(jsonb) from public, anon;
revoke execute on function public.roflix_gacha_merge(jsonb) from public, anon;
revoke execute on function public.roflix_gacha_get() from public, anon;
revoke execute on function public.roflix_gacha_sell(text) from public, anon;
revoke execute on function public.roflix_watch_history_sync(jsonb) from public, anon;
revoke execute on function public.roflix_watch_history_get() from public, anon;

grant execute on function public.roflix_user_adjust_gem(bigint) to authenticated;
grant execute on function public.roflix_user_get_gem() to authenticated;
grant execute on function public.roflix_profile_get() to authenticated;
grant execute on function public.roflix_profile_sync(jsonb) to authenticated;
grant execute on function public.roflix_gacha_merge(jsonb) to authenticated;
grant execute on function public.roflix_gacha_get() to authenticated;
grant execute on function public.roflix_gacha_sell(text) to authenticated;
grant execute on function public.roflix_watch_history_sync(jsonb) to authenticated;
grant execute on function public.roflix_watch_history_get() to authenticated;
