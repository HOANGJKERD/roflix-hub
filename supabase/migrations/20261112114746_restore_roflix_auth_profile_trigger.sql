-- Restore automatic profile creation on new Auth signups in the Sydney project.
-- This migration was applied to Supabase project lovoqkjvveooyewjsuxt.
drop trigger if exists roflix_auth_user_created on auth.users;

create trigger roflix_auth_user_created
after insert on auth.users
for each row
execute function public.roflix_create_profile();
