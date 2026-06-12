-- Create get_smart_search_suggestions RPC for typo-tolerant suggestions
CREATE OR REPLACE FUNCTION public.get_smart_search_suggestions(search_query TEXT)
RETURNS JSONB AS $$
DECLARE
  v_products JSONB;
  v_categories JSONB;
  v_brands JSONB;
  v_did_you_mean TEXT;
  v_trimmed TEXT;
BEGIN
  v_trimmed := trim(search_query);
  
  -- 1. Query Products (exact or fuzzy matching via pg_trgm similarity)
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_products FROM (
    SELECT 
      id, 
      name, 
      slug, 
      price, 
      sale_price, 
      image_url,
      similarity(name, v_trimmed) AS sim
    FROM public.products
    WHERE status = 'Active'
      AND (name ILIKE '%' || v_trimmed || '%' OR description ILIKE '%' || v_trimmed || '%' OR similarity(name, v_trimmed) > 0.18)
    ORDER BY 
      CASE WHEN name ILIKE '%' || v_trimmed || '%' THEN 1 ELSE 0 END DESC,
      sim DESC
    LIMIT 5
  ) t;

  -- 2. Query Categories
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_categories FROM (
    SELECT 
      id, 
      name, 
      slug,
      similarity(name, v_trimmed) AS sim
    FROM public.categories
    WHERE status = true
      AND (name ILIKE '%' || v_trimmed || '%' OR similarity(name, v_trimmed) > 0.15)
    ORDER BY 
      CASE WHEN name ILIKE '%' || v_trimmed || '%' THEN 1 ELSE 0 END DESC,
      sim DESC
    LIMIT 3
  ) t;

  -- 3. Query Brands
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_brands FROM (
    SELECT 
      id, 
      name,
      similarity(name, v_trimmed) AS sim
    FROM public.brands
    WHERE (name ILIKE '%' || v_trimmed || '%' OR similarity(name, v_trimmed) > 0.15)
    ORDER BY 
      CASE WHEN name ILIKE '%' || v_trimmed || '%' THEN 1 ELSE 0 END DESC,
      sim DESC
    LIMIT 3
  ) t;

  -- 4. Calculate "Did you mean?" spelling suggestion
  SELECT name INTO v_did_you_mean FROM (
    SELECT name, similarity(name, v_trimmed) AS sim
    FROM (
      SELECT name FROM public.categories WHERE status = true
      UNION
      SELECT name FROM public.brands
      UNION
      SELECT name FROM public.products WHERE status = 'Active'
    ) terms
    WHERE lower(name) != lower(v_trimmed)
    ORDER BY sim DESC
    LIMIT 1
  ) spelling
  WHERE sim > 0.25 AND sim < 0.95;

  RETURN jsonb_build_object(
    'products', v_products,
    'categories', v_categories,
    'brands', v_brands,
    'did_you_mean', v_did_you_mean
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
