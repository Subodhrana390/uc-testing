-- Add GST related fields to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hsn_code text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_tax_inclusive boolean DEFAULT false;
