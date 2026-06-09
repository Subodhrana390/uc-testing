-- Add updated_at column to products and categories
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
