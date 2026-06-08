-- 1. Create Enums and Sequences
CREATE TYPE invoice_status_enum AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED', 'VOID');
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS credit_note_number_seq START 1;

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number varchar UNIQUE NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status invoice_status_enum NOT NULL DEFAULT 'DRAFT',
    
    -- Financials
    subtotal numeric(10,2) NOT NULL DEFAULT 0,
    discount_amount numeric(10,2) NOT NULL DEFAULT 0,
    tax_amount numeric(10,2) NOT NULL DEFAULT 0,
    shipping_amount numeric(10,2) NOT NULL DEFAULT 0,
    total_amount numeric(10,2) NOT NULL DEFAULT 0,
    currency varchar(3) NOT NULL DEFAULT 'INR',
    
    -- GST Specifics (Breakup)
    cgst numeric(10,2) DEFAULT 0,
    sgst numeric(10,2) DEFAULT 0,
    igst numeric(10,2) DEFAULT 0,
    
    -- Metadata
    pdf_url text,
    notes text,
    
    -- Timestamps
    issued_at timestamptz,
    due_date timestamptz,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 3. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id uuid, -- No hard FK constraint to prevent issues if product is deleted
    variant_id uuid,
    product_name text NOT NULL,
    sku text,
    hsn_code text,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    line_total numeric(10,2) NOT NULL
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Admins can manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 4. Credit Notes Table
CREATE TABLE IF NOT EXISTS public.credit_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_number varchar UNIQUE NOT NULL,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    refund_amount numeric(10,2) NOT NULL,
    reason text,
    pdf_url text,
    issued_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credit notes" ON public.credit_notes FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = credit_notes.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Admins can manage credit notes" ON public.credit_notes FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON public.credit_notes(invoice_id);
