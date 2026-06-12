-- Create banners storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create deals storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deals', 'deals', true)
ON CONFLICT (id) DO NOTHING;

-- Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;
