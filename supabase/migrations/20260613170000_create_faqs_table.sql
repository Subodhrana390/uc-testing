-- Create FAQs table
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read published FAQs" ON public.faqs;

-- Create SELECT policy for public (anon/authenticated) to read published FAQs
CREATE POLICY "Allow public read published FAQs"
  ON public.faqs FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Seed initial FAQ items
INSERT INTO public.faqs (question, answer, category, sort_order, is_published)
VALUES 
  (
    'How do I place an order for laboratory or industrial supplies?',
    'To place an order, browse our categories or search for specific products. Adjust the quantity and click ''Add to Cart''. You can complete checkout securely using credit/debit cards, net banking, or UPI.',
    'Ordering',
    10,
    true
  ),
  (
    'How long does shipping take and how are estimates calculated?',
    'Transit times depend on your destination. We calculate estimates dynamically using your pincode''s prefix mapping. Standard delivery takes 3-7 business days, while regional express zones can receive items in 24-48 hours. Use the ''Delivery Check'' tool on the product page to see options for your location.',
    'Shipping',
    20,
    true
  ),
  (
    'Can I track my shipment in real-time?',
    'Yes, once your order is dispatched, a tracking number and logistics link will be sent to your registered email and mobile number. You can also input your Order ID on our ''Track Order'' page to check the fulfillment status.',
    'Shipping',
    30,
    true
  ),
  (
    'Are your chemical reagents and lab equipment certified?',
    'Yes, all reagents, precision glassware, and testing instruments supplied by UC Enterprises conform to strict quality guidelines. Certificates of Analysis (COA) and MSDS document sheets are available on request for chemical products.',
    'Products',
    40,
    true
  ),
  (
    'What is your return and replacement policy?',
    'Due to the sensitive nature of scientific equipment and chemical reagents, we accept returns within 7 days of delivery only for items that arrive damaged, defective, or unopened in original packaging. Please contact our support team to initiate a return request.',
    'Support',
    50,
    true
  )
ON CONFLICT DO NOTHING;
