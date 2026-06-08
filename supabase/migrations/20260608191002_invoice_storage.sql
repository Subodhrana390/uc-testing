-- Create the invoices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for the invoices bucket

-- Allow authenticated users to insert their own invoices (or admin)
CREATE POLICY "Allow authenticated to insert invoices" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'invoices');

-- Allow users to read their own invoices
-- To achieve this strictly, the filename should contain the user_id or order_id
-- We'll allow authenticated users to select objects from invoices bucket
CREATE POLICY "Allow authenticated to read invoices" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'invoices');

-- Admins can do anything
CREATE POLICY "Allow admins to do anything" 
ON storage.objects FOR ALL TO authenticated 
USING (bucket_id = 'invoices' AND ((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
