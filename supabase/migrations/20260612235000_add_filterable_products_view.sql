-- Create filterable_products view with RLS context invocation
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

-- Make existing attributes filterable
UPDATE public.attributes
SET is_filterable = true
WHERE name IN ('Protection Class', 'Size Standard', 'Visibility Type');
