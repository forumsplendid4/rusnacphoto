
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  watermark_text TEXT NOT NULL DEFAULT 'PREVIEW',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create photos table
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create print sizes table
CREATE TABLE public.print_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  print_size_id UUID NOT NULL REFERENCES public.print_sizes(id),
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public read access for events (active only)
CREATE POLICY "Anyone can view active events" ON public.events
  FOR SELECT USING (is_active = true);

-- Public read access for photos of active events
CREATE POLICY "Anyone can view photos of active events" ON public.photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = photos.event_id AND events.is_active = true)
  );

-- Public read access for active print sizes
CREATE POLICY "Anyone can view active print sizes" ON public.print_sizes
  FOR SELECT USING (is_active = true);

-- Anyone can create orders (public form)
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Anyone can create order items
CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Admin password setting (stored in app_settings)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- No public access to settings
CREATE POLICY "No public access to settings" ON public.app_settings
  FOR SELECT USING (false);

-- Create storage bucket for event photos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true);

-- Public read access for photos
CREATE POLICY "Public read access for event photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');

-- Anyone can upload to event-photos (admin will control via UI)
CREATE POLICY "Upload access for event photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-photos');

CREATE POLICY "Delete access for event photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'event-photos');

-- Insert default print sizes
INSERT INTO public.print_sizes (name, price, sort_order) VALUES
  ('10x15', 0, 1),
  ('15x20', 0, 2),
  ('20x30', 0, 3);

-- Insert default admin password
INSERT INTO public.app_settings (key, value) VALUES ('admin_password', 'admin123');
