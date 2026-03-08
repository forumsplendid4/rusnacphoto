-- Fast lookup for event pages and photo ordering
CREATE INDEX IF NOT EXISTS idx_events_slug_active ON public.events (slug, is_active);
CREATE INDEX IF NOT EXISTS idx_photos_event_sort ON public.photos (event_id, sort_order);

-- Safe order creation without exposing SELECT on orders (PII)
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_event_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_expected integer;
  v_inserted integer;
BEGIN
  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'customer_name_required';
  END IF;

  IF p_customer_phone IS NULL OR btrim(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'customer_phone_required';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND e.is_active = true
  ) THEN
    RAISE EXCEPTION 'event_not_active';
  END IF;

  INSERT INTO public.orders (event_id, customer_name, customer_phone)
  VALUES (p_event_id, btrim(p_customer_name), btrim(p_customer_phone))
  RETURNING id INTO v_order_id;

  WITH normalized AS (
    SELECT
      (item->>'photo_id')::uuid AS photo_id,
      (item->>'print_size_id')::uuid AS print_size_id,
      GREATEST(COALESCE((item->>'quantity')::integer, 1), 1) AS quantity
    FROM jsonb_array_elements(p_items) AS item
  ),
  validated AS (
    SELECT n.photo_id, n.print_size_id, n.quantity
    FROM normalized n
    JOIN public.photos p
      ON p.id = n.photo_id
     AND p.event_id = p_event_id
    JOIN public.print_sizes ps
      ON ps.id = n.print_size_id
     AND ps.is_active = true
  )
  INSERT INTO public.order_items (order_id, photo_id, print_size_id, quantity)
  SELECT v_order_id, v.photo_id, v.print_size_id, v.quantity
  FROM validated v;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_expected := jsonb_array_length(p_items);

  IF v_inserted <> v_expected THEN
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE EXCEPTION 'invalid_order_items';
  END IF;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(uuid, text, text, jsonb) TO anon, authenticated;

-- Keep event deletion reliable (DB rows only, storage cleanup can be handled separately)
CREATE OR REPLACE FUNCTION public.admin_delete_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_event(uuid) TO anon, authenticated;

-- Delete one photo inside event (with cascading order_items cleanup via FK)
CREATE OR REPLACE FUNCTION public.admin_delete_photo(p_photo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.photos WHERE id = p_photo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_photo(uuid) TO anon, authenticated;