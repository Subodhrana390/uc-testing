-- Add newsletter_settings column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_settings jsonb DEFAULT '{}'::jsonb NOT NULL;
