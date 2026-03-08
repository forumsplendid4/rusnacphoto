-- Drop both overloads of admin_get_events
DROP FUNCTION IF EXISTS public.admin_get_events();
DROP FUNCTION IF EXISTS public.admin_get_events(text);

-- Drop old admin_create_event overloads
DROP FUNCTION IF EXISTS public.admin_create_event(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_create_event(text, text, text, text);

-- Recreate admin_get_events with access_key
CREATE FUNCTION public.admin_get_events(p_admin_token text DEFAULT NULL)
RETURNS TABLE(id uuid, title text, slug text, description text, is_active boolean, watermark_text text, created_at timestamptz, photo_count bigint, order_count bigint, access_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
  SELECT
    e.id, e.title, e.slug, e.description, e.is_active, e.watermark_text, e.created_at,
    (SELECT count(*) FROM public.photos p WHERE p.event_id = e.id) AS photo_count,
    (SELECT count(*) FROM public.orders o WHERE o.event_id = e.id) AS order_count,
    e.access_key
  FROM public.events e
  ORDER BY e.created_at DESC;
END;
$$;

-- Recreate admin_create_event with access_key param
CREATE FUNCTION public.admin_create_event(p_admin_token text, p_title text, p_slug text, p_description text DEFAULT NULL, p_watermark_text text DEFAULT 'PREVIEW', p_access_key text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  v_key := COALESCE(NULLIF(BTRIM(p_access_key), ''), UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 6)));
  INSERT INTO public.events (title, slug, description, watermark_text, access_key)
  VALUES (p_title, p_slug, p_description, p_watermark_text, v_key);
END;
$$;

-- Public function to find event by access key
CREATE FUNCTION public.find_event_by_key(p_key text)
RETURNS TABLE(id uuid, title text, slug text, description text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.title, e.slug, e.description
  FROM public.events e
  WHERE e.access_key = UPPER(BTRIM(p_key))
    AND e.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_event_by_key(text) TO anon, authenticated;