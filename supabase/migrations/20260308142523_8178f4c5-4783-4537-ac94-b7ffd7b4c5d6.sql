-- Add explicit deny-all policies so RLS intent is clear and linter-clean
CREATE POLICY "No direct access to orders"
ON public.orders
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct access to order_items"
ON public.order_items
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);