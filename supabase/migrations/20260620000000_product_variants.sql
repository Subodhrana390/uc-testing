-- 1. Modify Categories
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS attributes_schema jsonb DEFAULT '[]'::jsonb;

-- 2. Modify Products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_variants boolean DEFAULT false;

-- 3. Create Product Variants
DROP TABLE IF EXISTS public.product_variants CASCADE;

CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku text UNIQUE NOT NULL,
    barcode text,
    price numeric(10, 2) NOT NULL CHECK (price >= 0),
    sale_price numeric(10, 2) CHECK (sale_price >= 0),
    stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_stock integer NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    weight numeric(10, 2),
    dimensions jsonb,
    images jsonb DEFAULT '[]'::jsonb,
    attributes jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast JSONB attribute filtering
CREATE INDEX IF NOT EXISTS product_variants_attributes_idx ON public.product_variants USING GIN (attributes);

-- Ensure only one default variant per product
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_one_default_idx 
ON public.product_variants (product_id) 
WHERE is_default = true;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active product variants" 
ON public.product_variants FOR SELECT 
TO public 
USING (status = 'ACTIVE');

CREATE POLICY "Admins can manage product variants" 
ON public.product_variants FOR ALL 
TO authenticated 
USING (is_admin());

-- 4. Modify Order Items
-- Add variant_id to order_items, nullable initially for backward compatibility
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'order_items_variant_id_fkey'
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items
        ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Data Migration: Create a default variant for every existing product
INSERT INTO public.product_variants (
    product_id, 
    sku, 
    price, 
    sale_price, 
    stock_quantity, 
    reserved_stock, 
    status, 
    is_default,
    attributes
)
SELECT 
    id,
    COALESCE(slug || '-default', 'SKU-' || substr(id::text, 1, 8)),
    price,
    sale_price,
    stock_quantity,
    COALESCE(reserved_stock, 0),
    UPPER(status),
    true,
    '{}'::jsonb
FROM public.products
ON CONFLICT (sku) DO NOTHING;

UPDATE public.products SET has_variants = true;
