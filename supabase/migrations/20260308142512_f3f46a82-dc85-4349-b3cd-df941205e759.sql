-- Tighten security: direct public inserts are no longer needed
-- Orders and items are now created only through create_order_with_items() security-definer function.
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;