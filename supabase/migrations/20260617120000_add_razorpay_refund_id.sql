-- Add razorpay_refund_id to orders to store refund transaction ID
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_refund_id text;
