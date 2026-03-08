
-- 1. Add admin session verification to all admin RPC functions
-- Each admin function will now verify the admin password from a session token passed as parameter

-- Helper function to verify admin token (reusable)
CREATE OR REPLACE FUNCTION public.verify_admin_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_settings
    WHERE key = 'admin_password' AND value = p_token
  );
$$;

-- Recreate admin_get_events with token verification
CREATE OR REPLACE FUNCTION public.admin_get_events(p_admin_token text DEFAULT NULL)
RETURNS TABLE(id uuid, title text, slug text, description text, is_active boolean, watermark_text text, created_at timestamp with time zone, photo_count bigint, order_count bigint)
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
    (SELECT count(*) FROM public.orders o WHERE o.event_id = e.id) AS order_count
  FROM public.events e
  ORDER BY e.created_at DESC;
END;
$$;

-- Recreate admin_create_event with token verification
CREATE OR REPLACE FUNCTION public.admin_create_event(p_admin_token text, p_title text, p_slug text, p_description text DEFAULT NULL, p_watermark_text text DEFAULT 'PREVIEW')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.events (title, slug, description, watermark_text)
  VALUES (p_title, p_slug, p_description, p_watermark_text);
END;
$$;

-- Recreate admin_toggle_event with token verification
CREATE OR REPLACE FUNCTION public.admin_toggle_event(p_admin_token text, p_event_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.events SET is_active = p_active WHERE id = p_event_id;
END;
$$;

-- Recreate admin_add_photo with token verification
CREATE OR REPLACE FUNCTION public.admin_add_photo(p_admin_token text, p_event_id uuid, p_storage_path text, p_filename text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.photos (event_id, storage_path, filename, sort_order)
  VALUES (p_event_id, p_storage_path, p_filename, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.photos WHERE event_id = p_event_id));
END;
$$;

-- Recreate admin_delete_photo with token verification
CREATE OR REPLACE FUNCTION public.admin_delete_photo(p_admin_token text, p_photo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM public.photos WHERE id = p_photo_id;
END;
$$;

-- Recreate admin_delete_event with token verification
CREATE OR REPLACE FUNCTION public.admin_delete_event(p_admin_token text, p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;

-- Recreate admin_get_orders with token verification
CREATE OR REPLACE FUNCTION public.admin_get_orders(p_admin_token text, p_event_id uuid)
RETURNS TABLE(customer_name text, customer_phone text, filename text, print_size_name text, quantity integer, created_at timestamp with time zone)
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
    o.customer_name,
    o.customer_phone,
    p.filename,
    ps.name AS print_size_name,
    oi.quantity,
    o.created_at
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.photos p ON p.id = oi.photo_id
  JOIN public.print_sizes ps ON ps.id = oi.print_size_id
  WHERE o.event_id = p_event_id
  ORDER BY o.created_at DESC, o.id, p.filename;
END;
$$;

-- Admin CRUD for print_sizes
CREATE OR REPLACE FUNCTION public.admin_get_print_sizes(p_admin_token text)
RETURNS TABLE(id uuid, name text, price numeric, is_active boolean, sort_order integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
  SELECT ps.id, ps.name, ps.price, ps.is_active, ps.sort_order
  FROM public.print_sizes ps
  ORDER BY ps.sort_order, ps.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_print_size(p_admin_token text, p_name text, p_price numeric DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.print_sizes (name, price, sort_order)
  VALUES (p_name, p_price, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.print_sizes));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_print_size(p_admin_token text, p_id uuid, p_name text, p_price numeric, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.print_sizes SET name = p_name, price = p_price, is_active = p_is_active WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_print_size(p_admin_token text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM public.print_sizes WHERE id = p_id;
END;
$$;

-- Lock down storage: remove any overly permissive policies and only allow public SELECT
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

CREATE POLICY "Public read event photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');

CREATE POLICY "Service role upload event photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-photos' AND (SELECT current_setting('role') = 'service_role'));

CREATE POLICY "Service role delete event photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'event-photos' AND (SELECT current_setting('role') = 'service_role'));
