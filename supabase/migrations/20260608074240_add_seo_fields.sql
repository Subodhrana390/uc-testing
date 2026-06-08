-- Add SEO fields to products
ALTER TABLE public.products 
ADD COLUMN seo_title text,
ADD COLUMN seo_description text,
ADD COLUMN seo_keywords text;

-- Add SEO fields to categories
ALTER TABLE public.categories 
ADD COLUMN seo_title text,
ADD COLUMN seo_description text,
ADD COLUMN seo_keywords text;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
