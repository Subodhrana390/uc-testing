-- Create site-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  CONSTRAINT single_row CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'UC Enterprises',
  logo_url TEXT,
  favicon_url TEXT,
  contact_phone TEXT DEFAULT '+91 98888 63377',
  contact_email TEXT DEFAULT 'ucenterprises1@gmail.com',
  contact_address TEXT DEFAULT 'Shop No. 1, Khairabad Village, Near Bus Stand, Bela Road, Khairabad, Ropar, Punjab - 140001, India.',
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo_title_default TEXT DEFAULT 'UC Enterprises — Laboratory, Industrial & Safety Supplies India',
  seo_description_default TEXT DEFAULT 'UC Enterprises — India''s trusted supplier of laboratory chemicals, glassware, safety equipment, industrial tools & electrical goods. Wholesale pricing, pan-India delivery.',
  seo_keywords_default TEXT[] DEFAULT ARRAY['laboratory chemicals', 'lab glassware', 'industrial equipment', 'safety equipment', 'PPE', 'chemical reagents', 'laboratory supplies India', 'industrial tools', 'scientific equipment', 'UC Enterprises'],
  whatsapp_number TEXT DEFAULT '919888863377',
  whatsapp_message TEXT DEFAULT 'Hello UC Enterprises, I have a query about your products.',
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Select is public
DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings;
CREATE POLICY "Allow public read access to site_settings" ON public.site_settings
  FOR SELECT USING (true);

-- Insert / Update / Delete is admin-only
DROP POLICY IF EXISTS "Allow admin write access to site_settings" ON public.site_settings;
CREATE POLICY "Allow admin write access to site_settings" ON public.site_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed the initial settings row
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Create navigation_links table
CREATE TABLE IF NOT EXISTS public.navigation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_external BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on navigation_links
ALTER TABLE public.navigation_links ENABLE ROW LEVEL SECURITY;

-- Select is public
DROP POLICY IF EXISTS "Allow public read access to navigation_links" ON public.navigation_links;
CREATE POLICY "Allow public read access to navigation_links" ON public.navigation_links
  FOR SELECT USING (true);

-- Insert / Update / Delete is admin-only
DROP POLICY IF EXISTS "Allow admin write access to navigation_links" ON public.navigation_links;
CREATE POLICY "Allow admin write access to navigation_links" ON public.navigation_links
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed default navigation links
INSERT INTO public.navigation_links (label, url, order_index, is_active, is_external) VALUES
  ('Home', '/', 10, true, false),
  ('Deals & Offers', '/products?promo=true', 20, true, false),
  ('Categories', '/categories', 30, true, false),
  ('All Products', '/products', 40, true, false),
  ('About Us', '/about', 50, true, false),
  ('Contact Us', '/contact', 60, true, false),
  ('Track Order', '/track-order', 70, true, false)
ON CONFLICT DO NOTHING;

-- Create handle_updated_at helper function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_navigation_links_updated_at ON public.navigation_links;
CREATE TRIGGER update_navigation_links_updated_at
  BEFORE UPDATE ON public.navigation_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
