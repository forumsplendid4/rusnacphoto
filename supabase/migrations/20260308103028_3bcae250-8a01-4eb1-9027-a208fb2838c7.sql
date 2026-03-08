
-- Verify admin password function
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_settings
    WHERE key = 'admin_password' AND value = input_password
  );
$$;

-- Admin: get all events with counts
CREATE OR REPLACE FUNCTION public.admin_get_events()
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  is_active BOOLEAN,
  watermark_text TEXT,
  created_at TIMESTAMPTZ,
  photo_count BIGINT,
  order_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id, e.title, e.slug, e.description, e.is_active, e.watermark_text, e.created_at,
    (SELECT count(*) FROM public.photos p WHERE p.event_id = e.id) AS photo_count,
    (SELECT count(*) FROM public.orders o WHERE o.event_id = e.id) AS order_count
  FROM public.events e
  ORDER BY e.created_at DESC;
$$;

-- Admin: create event
CREATE OR REPLACE FUNCTION public.admin_create_event(
  p_title TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_watermark_text TEXT DEFAULT 'PREVIEW'
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.events (title, slug, description, watermark_text)
  VALUES (p_title, p_slug, p_description, p_watermark_text);
$$;

-- Admin: toggle event active status
CREATE OR REPLACE FUNCTION public.admin_toggle_event(p_event_id UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.events SET is_active = p_active WHERE id = p_event_id;
$$;

-- Admin: add photo record
CREATE OR REPLACE FUNCTION public.admin_add_photo(p_event_id UUID, p_storage_path TEXT, p_filename TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.photos (event_id, storage_path, filename, sort_order)
  VALUES (p_event_id, p_storage_path, p_filename, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.photos WHERE event_id = p_event_id));
$$;

-- Admin: delete event
CREATE OR REPLACE FUNCTION public.admin_delete_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete storage objects for this event's photos
  DELETE FROM storage.objects WHERE bucket_id = 'event-photos' AND name LIKE p_event_id::text || '/%';
  -- Delete event (cascades to photos, orders, order_items)
  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;

-- Admin: get orders for an event (flat list)
CREATE OR REPLACE FUNCTION public.admin_get_orders(p_event_id UUID)
RETURNS TABLE (
  customer_name TEXT,
  customer_phone TEXT,
  filename TEXT,
  print_size_name TEXT,
  quantity INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
