-- 1. Create Enums
CREATE TYPE stock_status_enum AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'ON_BACKORDER');
CREATE TYPE inventory_transaction_type AS ENUM ('SALE', 'PURCHASE', 'RETURN', 'REFUND', 'RESERVATION', 'RELEASE', 'ADJUSTMENT');
CREATE TYPE reservation_status AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONVERTED');

-- 2. Modify Products Table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS manage_stock boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS backorders_allowed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_status stock_status_enum DEFAULT 'IN_STOCK';

-- Ensure reserved_stock exists from previous migrations, just in case
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reserved_stock integer DEFAULT 0 CHECK (reserved_stock >= 0);

-- 3. Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku text UNIQUE NOT NULL,
    name text NOT NULL, -- e.g., "Red / M"
    attributes jsonb DEFAULT '{}'::jsonb, -- e.g., {"color": "Red", "size": "M"}
    price numeric(10, 2), -- Override base product price if needed
    sale_price numeric(10, 2),
    stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_stock integer NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    manage_stock boolean DEFAULT true,
    low_stock_threshold integer DEFAULT 5,
    backorders_allowed boolean DEFAULT false,
    stock_status stock_status_enum DEFAULT 'IN_STOCK',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view product variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins can manage product variants" ON public.product_variants FOR ALL TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 4. Inventory Transactions Table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
    type inventory_transaction_type NOT NULL,
    quantity integer NOT NULL, -- Can be negative or positive depending on type and context, but usually absolute quantity involved in the transaction
    before_stock integer NOT NULL,
    after_stock integer NOT NULL,
    reference_id uuid, -- Order ID, Return ID, or Admin User ID for adjustments
    reference_type text, -- 'ORDER', 'RETURN', 'REFUND', 'ADJUSTMENT'
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) -- Admin who made the adjustment, or system for orders
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));
-- System functions bypass RLS to insert

-- 5. Inventory Reservations Table
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity integer NOT NULL CHECK (quantity > 0),
    expires_at timestamptz NOT NULL,
    status reservation_status NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
-- Internal table used by functions, restrict direct access
CREATE POLICY "Admins can view reservations" ON public.inventory_reservations FOR SELECT TO authenticated USING (((auth.jwt() ->> 'email') LIKE '%@ucenterprises.com'));

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_product_id ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_res_status_expires ON public.inventory_reservations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_res_order_id ON public.inventory_reservations(order_id);
