-- 1. Enable RLS on logistics tables
ALTER TABLE public.delivery_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insecure policies (using DROP POLICY IF EXISTS)
-- Products
DROP POLICY IF EXISTS "Allow all for products" ON public.products;
-- Orders
DROP POLICY IF EXISTS "Allow all for orders" ON public.orders;
-- Order Items
DROP POLICY IF EXISTS "Allow all for order_items" ON public.order_items;
-- Categories
DROP POLICY IF EXISTS "Allow all access for categories to authenticated users" ON public.categories;
-- Brands
DROP POLICY IF EXISTS "Allow authenticated full-access on brands" ON public.brands;
-- Deals
DROP POLICY IF EXISTS "Allow all access for deals to authenticated users" ON public.deals;
-- Banners
DROP POLICY IF EXISTS "Allow all access for banners to authenticated users" ON public.banners;
-- Attribute Groups
DROP POLICY IF EXISTS "Allow all authenticated for attribute_groups" ON public.attribute_groups;
-- Attributes
DROP POLICY IF EXISTS "Allow all authenticated for attributes" ON public.attributes;
-- Product Attributes
DROP POLICY IF EXISTS "Allow all authenticated for product_attributes" ON public.product_attributes;
-- Related Products
DROP POLICY IF EXISTS "Allow all authenticated for related_products" ON public.related_products;
-- Delivery Zones
DROP POLICY IF EXISTS "Admin manage delivery zones" ON public.delivery_zones;

-- Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on banners bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on deals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload on banners bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete on banners bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update on banners bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload on deals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete on deals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update on deals bucket" ON storage.objects;

-- 3. Drop new policies if they already exist (to support clean reapplies)
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Admin manage products" ON public.products;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admin manage brands" ON public.brands;
DROP POLICY IF EXISTS "Admin manage deals" ON public.deals;
DROP POLICY IF EXISTS "Admin manage banners" ON public.banners;
DROP POLICY IF EXISTS "Public read attribute_groups" ON public.attribute_groups;
DROP POLICY IF EXISTS "Admin manage attribute_groups" ON public.attribute_groups;
DROP POLICY IF EXISTS "Public read attributes" ON public.attributes;
DROP POLICY IF EXISTS "Admin manage attributes" ON public.attributes;
DROP POLICY IF EXISTS "Public read product_attributes" ON public.product_attributes;
DROP POLICY IF EXISTS "Admin manage product_attributes" ON public.product_attributes;
DROP POLICY IF EXISTS "Public read related_products" ON public.related_products;
DROP POLICY IF EXISTS "Admin manage related_products" ON public.related_products;
DROP POLICY IF EXISTS "Admin manage delivery_zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Public read delivery_pincodes" ON public.delivery_pincodes;
DROP POLICY IF EXISTS "Admin manage delivery_pincodes" ON public.delivery_pincodes;
DROP POLICY IF EXISTS "Public read delivery_carriers" ON public.delivery_carriers;
DROP POLICY IF EXISTS "Admin manage delivery_carriers" ON public.delivery_carriers;
DROP POLICY IF EXISTS "Public read delivery_settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "Admin manage delivery_settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "Public select objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage objects" ON storage.objects;

-- 4. Establish Secure RLS Policies

-- Products
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- Orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')));
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- Order Items
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR ((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')))));
CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())));
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- Categories & Brands
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Admin manage brands" ON public.brands FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- Banners & Deals
CREATE POLICY "Admin manage banners" ON public.banners FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Admin manage deals" ON public.deals FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- Attributes
CREATE POLICY "Public read attribute_groups" ON public.attribute_groups FOR SELECT USING (true);
CREATE POLICY "Admin manage attribute_groups" ON public.attribute_groups FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Public read attributes" ON public.attributes FOR SELECT USING (true);
CREATE POLICY "Admin manage attributes" ON public.attributes FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Public read product_attributes" ON public.product_attributes FOR SELECT USING (true);
CREATE POLICY "Admin manage product_attributes" ON public.product_attributes FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Public read related_products" ON public.related_products FOR SELECT USING (true);
CREATE POLICY "Admin manage related_products" ON public.related_products FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- Logistics
CREATE POLICY "Admin manage delivery_zones" ON public.delivery_zones FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Public read delivery_pincodes" ON public.delivery_pincodes FOR SELECT USING (true);
CREATE POLICY "Admin manage delivery_pincodes" ON public.delivery_pincodes FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Public read delivery_carriers" ON public.delivery_carriers FOR SELECT USING (true);
CREATE POLICY "Admin manage delivery_carriers" ON public.delivery_carriers FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Public read delivery_settings" ON public.delivery_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage delivery_settings" ON public.delivery_settings FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- Storage objects
CREATE POLICY "Public select objects" ON storage.objects FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage objects" ON storage.objects FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')) WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
