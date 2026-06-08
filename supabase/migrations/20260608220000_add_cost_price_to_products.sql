-- Add cost_price to products and variants to enable profit tracking
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric(10, 2) DEFAULT 0;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS cost_price numeric(10, 2) DEFAULT 0;

-- Track historical cost price at the time of order placement
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS cost_price numeric(10, 2) DEFAULT 0;
