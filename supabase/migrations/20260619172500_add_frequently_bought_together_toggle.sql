-- Add frequently_bought_together_enabled toggle to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS frequently_bought_together_enabled BOOLEAN NOT NULL DEFAULT true;
