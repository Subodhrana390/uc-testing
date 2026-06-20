-- Add name column to product_variants
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS name text;

-- Backfill: derive name from attributes (e.g. "Red / XL") or fall back to SKU
UPDATE public.product_variants
SET name = CASE
  WHEN attributes IS NOT NULL AND attributes <> '{}'::jsonb
    THEN (SELECT string_agg(value, ' / ') FROM jsonb_each_text(attributes))
  ELSE sku
END
WHERE name IS NULL;
