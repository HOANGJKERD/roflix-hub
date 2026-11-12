-- Public movie playback: login is no longer required, including previously locked titles.
update public.roflix_movie_settings
set force_login_for_locked = false,
    updated_at = now()
where id = true;
insert into public.roflix_movie_settings(id, lock_18_plus)
values (true, true)
on conflict (id) do update
set force_login_for_locked = false,
    updated_at = now();
