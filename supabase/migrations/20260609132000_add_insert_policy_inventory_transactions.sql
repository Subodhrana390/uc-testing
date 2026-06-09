-- Add INSERT policy on inventory_transactions for admin users
CREATE POLICY "Admins can insert transactions" ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
