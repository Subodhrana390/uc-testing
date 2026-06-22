-- 1. Create Shipping Charges Table
CREATE TABLE IF NOT EXISTS public.shipping_charges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    carrier_name TEXT NOT NULL,
    tracking_number TEXT,
    actual_shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    charged_to_customer NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shipping_gst NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shipping_profit NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DISPATCHED', 'DELIVERED', 'RETURNED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create GST Ledger Table
CREATE TABLE IF NOT EXISTS public.gst_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    taxable_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cgst NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sgst NUMERIC(10, 2) NOT NULL DEFAULT 0,
    igst NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shipping_tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_tax_collected NUMERIC(10, 2) NOT NULL DEFAULT 0,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Accounting Entries Table (Double Entry System)
CREATE TABLE IF NOT EXISTS public.accounting_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('REVENUE', 'GST_PAYABLE', 'SHIPPING_REVENUE')),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.shipping_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

-- Policies for Admins only
CREATE POLICY "Admins can manage shipping_charges" ON public.shipping_charges
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage gst_ledger" ON public.gst_ledger
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage accounting_entries" ON public.accounting_entries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Optionally add index for faster dashboard lookups
CREATE INDEX IF NOT EXISTS idx_gst_ledger_month_year ON public.gst_ledger(month, year);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_year ON public.gst_ledger(year);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_type ON public.accounting_entries(entry_type);
