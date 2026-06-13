-- Add is_hidden column to product_reviews for admin moderation
ALTER TABLE public.product_reviews
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
