-- 1. Add last_activity tracking column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now();

-- 2. Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  -- Check JWT email claims (fast, no database query)
  IF (auth.jwt() ->> 'email') LIKE '%@ucenterprises.com' THEN
    RETURN true;
  END IF;

  -- Check profiles role in database
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role = 'admin';
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate policies for public.products
DROP POLICY IF EXISTS "Admin manage products" ON public.products;
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 4. Recreate policies for public.orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated 
  USING ((auth.uid() = user_id) OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 5. Recreate policies for public.order_items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
      AND (orders.user_id = auth.uid() OR public.is_admin())
  ));

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 6. Recreate policies for public.profiles
DROP POLICY IF EXISTS "Profiles are viewable by admins" ON public.profiles;
CREATE POLICY "Profiles are viewable by admins" ON public.profiles FOR SELECT TO authenticated 
  USING (public.is_admin());

-- 7. Recreate policies for public.payments
DROP POLICY IF EXISTS "Payments are viewable by admins" ON public.payments;
CREATE POLICY "Payments are viewable by admins" ON public.payments FOR SELECT TO authenticated 
  USING (public.is_admin());

-- 8. Recreate policies for public.order_status_history
DROP POLICY IF EXISTS "Users can view own status history" ON public.order_status_history;
CREATE POLICY "Users can view own status history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_status_history.order_id 
      AND (orders.user_id = auth.uid() OR public.is_admin())
  ));

DROP POLICY IF EXISTS "Authorized actors can insert status history" ON public.order_status_history;
CREATE POLICY "Authorized actors can insert status history" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

-- 9. Recreate policies for public.categories
DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 10. Recreate policies for public.brands
DROP POLICY IF EXISTS "Admin manage brands" ON public.brands;
CREATE POLICY "Admin manage brands" ON public.brands FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 11. Recreate policies for public.banners
DROP POLICY IF EXISTS "Admin manage banners" ON public.banners;
CREATE POLICY "Admin manage banners" ON public.banners FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 12. Recreate policies for public.deals
DROP POLICY IF EXISTS "Admin manage deals" ON public.deals;
CREATE POLICY "Admin manage deals" ON public.deals FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 13. Recreate policies for public.attribute_groups
DROP POLICY IF EXISTS "Admin manage attribute_groups" ON public.attribute_groups;
CREATE POLICY "Admin manage attribute_groups" ON public.attribute_groups FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 14. Recreate policies for public.attributes
DROP POLICY IF EXISTS "Admin manage attributes" ON public.attributes;
CREATE POLICY "Admin manage attributes" ON public.attributes FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 15. Recreate policies for public.product_attributes
DROP POLICY IF EXISTS "Admin manage product_attributes" ON public.product_attributes;
CREATE POLICY "Admin manage product_attributes" ON public.product_attributes FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 16. Recreate policies for public.related_products
DROP POLICY IF EXISTS "Admin manage related_products" ON public.related_products;
CREATE POLICY "Admin manage related_products" ON public.related_products FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 17. Recreate policies for public.delivery_zones
DROP POLICY IF EXISTS "Admin manage delivery_zones" ON public.delivery_zones;
CREATE POLICY "Admin manage delivery_zones" ON public.delivery_zones FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 18. Recreate policies for public.delivery_pincodes
DROP POLICY IF EXISTS "Admin manage delivery_pincodes" ON public.delivery_pincodes;
CREATE POLICY "Admin manage delivery_pincodes" ON public.delivery_pincodes FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 19. Recreate policies for public.delivery_carriers
DROP POLICY IF EXISTS "Admin manage delivery_carriers" ON public.delivery_carriers;
CREATE POLICY "Admin manage delivery_carriers" ON public.delivery_carriers FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 20. Recreate policies for public.delivery_settings
DROP POLICY IF EXISTS "Admin manage delivery_settings" ON public.delivery_settings;
CREATE POLICY "Admin manage delivery_settings" ON public.delivery_settings FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 21. Recreate storage objects policies
DROP POLICY IF EXISTS "Admin manage objects" ON storage.objects;
CREATE POLICY "Admin manage objects" ON storage.objects FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 22. Create top selling products view
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
