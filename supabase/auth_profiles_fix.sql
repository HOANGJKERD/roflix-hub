-- RoFlix: repair Auth -> profiles synchronization
-- Run in Supabase SQL Editor if existing auth.users rows are missing profiles.

CREATE OR REPLACE FUNCTION public.roflix_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(COALESCE(NEW.email,''),'@',1), 'User'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS roflix_auth_user_created ON auth.users;
CREATE TRIGGER roflix_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.roflix_create_profile();

-- Backfill existing Auth users that do not yet have a profile.
INSERT INTO public.profiles (id, display_name, role)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'display_name',''), split_part(COALESCE(u.email,''),'@',1), 'User'),
  'user'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Verify
SELECT u.id, u.email, p.display_name, p.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
