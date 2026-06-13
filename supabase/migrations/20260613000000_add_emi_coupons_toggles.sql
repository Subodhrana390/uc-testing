-- Add emi_enabled and coupons_enabled toggles to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS emi_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS coupons_enabled BOOLEAN NOT NULL DEFAULT true;
