-- Create private bucket for originals
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-originals', 'event-originals', false)
ON CONFLICT (id) DO NOTHING;

-- Add original_storage_path column to photos
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS original_storage_path text;

-- RPC: admin_add_photo with original path support
CREATE OR REPLACE FUNCTION public.admin_add_photo(
  p_admin_token text,
  p_event_id uuid,
  p_storage_path text,
  p_filename text,
  p_original_storage_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.verify_admin_token(p_admin_token) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.photos (event_id, storage_path, filename, sort_order, original_storage_path)
  VALUES (
    p_event_id,
    p_storage_path,
    p_filename,
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.photos WHERE event_id = p_event_id),
    p_original_storage_path
  );
END;
$$;

-- RPC: get orders for print with original paths
CREATE OR REPLACE FUNCTION public.admin_get_orders_for_print(
  p_admin_token text,
  p_event_id uuid
)
RETURNS TABLE(
  customer_name text,
  photo_filename text,
  original_storage_path text,
  storage_path text,
  print_size_name text,
  quantity integer
)
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
    p.filename AS photo_filename,
    p.original_storage_path,
    p.storage_path,
    ps.name AS print_size_name,
    oi.quantity
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.photos p ON p.id = oi.photo_id
  JOIN public.print_sizes ps ON ps.id = oi.print_size_id
  WHERE o.event_id = p_event_id
  ORDER BY ps.name, o.customer_name, p.filename;
END;
$$;