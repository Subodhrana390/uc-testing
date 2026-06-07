-- 1. Modify Products Table for Inventory Lifecycle
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS reserved_stock integer DEFAULT 0 CHECK (reserved_stock >= 0),
ADD COLUMN IF NOT EXISTS damaged_stock integer DEFAULT 0 CHECK (damaged_stock >= 0),
ADD COLUMN IF NOT EXISTS returned_stock integer DEFAULT 0 CHECK (returned_stock >= 0);

-- Ensure stock_quantity doesn't go negative
ALTER TABLE public.products 
ADD CONSTRAINT stock_quantity_check CHECK (stock_quantity >= 0);

-- 2. Modify Profiles for COD protection
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cod_rejections integer DEFAULT 0 CHECK (cod_rejections >= 0);

-- 3. Modify Orders for Idempotency
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- 4. Processed Webhooks (Idempotency for Razorpay Webhooks)
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text UNIQUE NOT NULL,
    event_type text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
-- No public policies, only system/admin should access

-- 5. Returns Table
CREATE TABLE IF NOT EXISTS public.returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'RETURN_REQUESTED' 
      CHECK (status IN ('RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_RECEIVED')),
    reason text NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb,
    admin_notes text,
    inspection_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(order_id)
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own returns" ON public.returns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own returns" ON public.returns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage returns" ON public.returns FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 6. Refunds Table
CREATE TABLE IF NOT EXISTS public.refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'REFUND_REQUESTED'
      CHECK (status IN ('REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_PROCESSING', 'REFUNDED', 'REFUND_FAILED')),
    reason text,
    gateway_refund_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own refunds" ON public.refunds FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = refunds.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage refunds" ON public.refunds FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 7. Shipments Table
CREATE TABLE IF NOT EXISTS public.shipments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    awb text UNIQUE,
    carrier text,
    status text NOT NULL DEFAULT 'LABEL_CREATED',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(order_id) -- One shipment per order
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own shipments" ON public.shipments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage shipments" ON public.shipments FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 8. Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES auth.users(id),
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT TO authenticated WITH CHECK (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
