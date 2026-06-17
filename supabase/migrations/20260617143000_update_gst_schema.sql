-- 1. Drop views that depend on products.tax_rate
DROP VIEW IF EXISTS public.top_selling_products;
DROP VIEW IF EXISTS public.filterable_products;

-- 2. Add new columns to categories
ALTER TABLE categories ADD COLUMN cgst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE categories ADD COLUMN sgst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE categories ADD COLUMN igst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE categories ADD COLUMN hsn_code TEXT;

-- 3. Add new columns to products
ALTER TABLE products ADD COLUMN cgst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN sgst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN igst_rate NUMERIC(5,2) DEFAULT 0;

-- 4. Migrate existing tax_rate data for categories
UPDATE categories SET 
  igst_rate = COALESCE(tax_rate, 0),
  cgst_rate = COALESCE(tax_rate, 0) / 2,
  sgst_rate = COALESCE(tax_rate, 0) / 2;

-- 5. Migrate existing tax_rate data for products
UPDATE products SET 
  igst_rate = COALESCE(tax_rate, 0),
  cgst_rate = COALESCE(tax_rate, 0) / 2,
  sgst_rate = COALESCE(tax_rate, 0) / 2;

-- 6. Drop the old column
ALTER TABLE categories DROP COLUMN tax_rate;
ALTER TABLE products DROP COLUMN tax_rate;

-- 7. Recreate the views with the new schema

-- Recreate top selling products view
CREATE OR REPLACE VIEW public.top_selling_products AS
SELECT 
  p.*,
  COALESCE(SUM(oi.quantity), 0) as sales_count
FROM public.products p
LEFT JOIN public.order_items oi ON p.id = oi.product_id
LEFT JOIN public.orders o ON oi.order_id = o.id
WHERE p.status = 'Active' 
  AND p.stock_quantity > 0 
  AND (o.status IS NULL OR o.status != 'CANCELLED')
GROUP BY p.id
ORDER BY sales_count DESC, p.created_at DESC;

-- Recreate filterable_products view
CREATE OR REPLACE VIEW public.filterable_products WITH (security_invoker = true) AS
SELECT
  p.*,
  COALESCE(p.sale_price, p.price) AS active_price,
  COALESCE((
    SELECT AVG(rating)
    FROM public.product_reviews r
    WHERE r.product_id = p.id
  ), 0) AS average_rating,
  COALESCE((
    SELECT COUNT(rating)
    FROM public.product_reviews r
    WHERE r.product_id = p.id
  ), 0)::INTEGER AS review_count,
  b.name AS brand_name,
  c.name AS category_name,
  c.slug AS category_slug,
  c.parent_id AS category_parent_id,
  pc.name AS parent_category_name,
  pc.slug AS parent_category_slug,
  (
    SELECT jsonb_object_agg(pa.attribute_id, pa.value)
    FROM public.product_attributes pa
    WHERE pa.product_id = p.id 
      AND pa.value IS NOT NULL 
      AND jsonb_typeof(pa.value) != 'null'
      AND pa.value != '""'::jsonb
  ) AS attributes
FROM public.products p
LEFT JOIN public.brands b ON p.brand_id = b.id
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.categories pc ON c.parent_id = pc.id;
