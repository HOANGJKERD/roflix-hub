-- Restore helper required by the Google Drive movie upsert RPC.
-- Keep it inaccessible to client roles; it is called from the SECURITY DEFINER RPC.
CREATE OR REPLACE FUNCTION public.roflix_to_jsonb(p_value text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
DECLARE
  parsed jsonb;
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN '[]'::jsonb;
  END IF;

  BEGIN
    parsed := p_value::jsonb;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Movie categories must be valid JSON';
  END;

  IF jsonb_typeof(parsed) <> 'array' THEN
    RAISE EXCEPTION 'Movie categories must be a JSON array';
  END IF;

  RETURN parsed;
END;
$function$;

REVOKE ALL ON FUNCTION public.roflix_to_jsonb(text) FROM PUBLIC, anon, authenticated;

-- The public custom-movie RLS policy evaluates this helper for anonymous reads.
-- It returns only a boolean and returns false when auth.uid() is NULL.
REVOKE ALL ON FUNCTION public.roflix_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.roflix_is_admin() TO anon, authenticated;
