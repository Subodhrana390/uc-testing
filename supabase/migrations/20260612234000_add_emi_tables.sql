-- 1. Create EMI Providers Table
CREATE TABLE IF NOT EXISTS public.emi_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    logo_url text,
    status boolean NOT NULL DEFAULT true,
    min_order_amount numeric NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create EMI Plans Table
CREATE TABLE IF NOT EXISTS public.emi_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.emi_providers(id) ON DELETE CASCADE,
    tenure_months integer NOT NULL CHECK (tenure_months > 0),
    interest_rate numeric NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS for both tables
ALTER TABLE public.emi_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_plans ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for EMI Providers
DROP POLICY IF EXISTS "EMI providers are viewable by everyone" ON public.emi_providers;
CREATE POLICY "EMI providers are viewable by everyone" ON public.emi_providers
  FOR SELECT TO public
  USING (status = true);

DROP POLICY IF EXISTS "Admins can manage EMI providers" ON public.emi_providers;
CREATE POLICY "Admins can manage EMI providers" ON public.emi_providers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. RLS Policies for EMI Plans
DROP POLICY IF EXISTS "EMI plans are viewable by everyone" ON public.emi_plans;
CREATE POLICY "EMI plans are viewable by everyone" ON public.emi_plans
  FOR SELECT TO public
  USING (active = true);

DROP POLICY IF EXISTS "Admins can manage EMI plans" ON public.emi_plans;
CREATE POLICY "Admins can manage EMI plans" ON public.emi_plans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Add EMI fields to public.orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_emi boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emi_provider_id uuid REFERENCES public.emi_providers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emi_plan_id uuid REFERENCES public.emi_plans(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emi_tenure integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emi_monthly_installment numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emi_interest_rate numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emi_total_payable numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emi_details jsonb;

-- 7. Update place_order_safe function to support EMI validation and storage
CREATE OR REPLACE FUNCTION public.place_order_safe(
    p_user_id uuid,
    p_customer_name text,
    p_customer_email text,
    p_phone text,
    p_shipping_address text,
    p_payment_method text,
    p_delivery_estimate text DEFAULT NULL::text,
    p_idempotency_key text DEFAULT NULL::text,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_attribution jsonb DEFAULT '{}'::jsonb,
    p_postal_code text DEFAULT NULL::text,
    p_coupon_code text DEFAULT NULL::text,
    p_is_emi boolean DEFAULT false,
    p_emi_provider_id uuid DEFAULT NULL,
    p_emi_plan_id uuid DEFAULT NULL,
    p_emi_tenure integer DEFAULT NULL,
    p_emi_monthly_installment numeric DEFAULT NULL,
    p_emi_interest_rate numeric DEFAULT NULL,
    p_emi_total_payable numeric DEFAULT NULL,
    p_emi_details jsonb DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $function$DECLARE
    v_order_id UUID;
    v_total_amount NUMERIC := 0;
    v_subtotal NUMERIC := 0;
    v_delivery_charge NUMERIC := 50;
    v_item RECORD;
    v_product RECORD;
    v_variant RECORD;
    v_cod_rejections INT := 0;
    
    -- Coupon variables
    v_coupon RECORD;
    v_discount_amount NUMERIC := 0;

    -- Order status defaults
    v_order_status TEXT := 'PENDING';
    v_payment_status TEXT := 'PENDING';

    v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
    v_price NUMERIC;

    -- EMI variables
    v_emi_provider RECORD;
    v_emi_plan RECORD;
    v_calculated_emi NUMERIC;
    v_calculated_total_payable NUMERIC;
    v_r NUMERIC;
    v_power NUMERIC;
BEGIN
    -- Validate cart
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;

    -- Idempotency check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id
        INTO v_order_id
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_order_id,
                'message', 'Order already exists for this idempotency key'
            );
        END IF;
    END IF;

    -- COD validation
    IF p_payment_method = 'COD' THEN
        SELECT COALESCE(cod_rejections, 0)
        INTO v_cod_rejections
        FROM public.profiles
        WHERE id = p_user_id;

        IF v_cod_rejections >= 3 THEN
            RAISE EXCEPTION
                'Cash on Delivery is disabled for this account due to excessive rejections.';
        END IF;

        v_order_status := 'CONFIRMED';
        v_payment_status := 'PENDING';
    END IF;

    -- Create order early
    INSERT INTO public.orders (
        user_id,
        customer_name,
        customer_email,
        phone,
        shipping_address,
        total_amount,
        payment_method,
        payment_status,
        status,
        delivery_estimate,
        idempotency_key
    )
    VALUES (
        p_user_id,
        p_customer_name,
        p_customer_email,
        p_phone,
        p_shipping_address,
        0,
        p_payment_method,
        v_payment_status,
        v_order_status,
        p_delivery_estimate,
        p_idempotency_key
    )
    RETURNING id INTO v_order_id;

    -- Process items
    FOR v_item IN
        SELECT *
        FROM jsonb_to_recordset(p_items) AS x(
            id UUID,
            variant_id UUID,
            quantity INTEGER
        )
    LOOP
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity for product %', v_item.id;
        END IF;

        -- Variant Product
        IF v_item.variant_id IS NOT NULL THEN
            SELECT price, sale_price, stock_quantity, name
            INTO v_variant
            FROM public.product_variants
            WHERE id = v_item.variant_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant with ID % not found', v_item.variant_id;
            END IF;

            IF v_variant.stock_quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Variant "%" is out of stock. Available: %', v_variant.name, v_variant.stock_quantity;
            END IF;

            v_price := COALESCE(v_variant.sale_price, v_variant.price);

            UPDATE public.product_variants
            SET
                stock_quantity = stock_quantity - v_item.quantity,
                reserved_stock = COALESCE(reserved_stock, 0) + v_item.quantity,
                updated_at = NOW()
            WHERE id = v_item.variant_id;

            INSERT INTO public.inventory_transactions (
                product_id,
                variant_id,
                type,
                quantity,
                before_stock,
                after_stock,
                reference_id,
                reference_type
            )
            VALUES (
                v_item.id,
                v_item.variant_id,
                'RESERVATION',
                v_item.quantity,
                v_variant.stock_quantity,
                v_variant.stock_quantity - v_item.quantity,
                v_order_id,
                'ORDER'
            );
        ELSE
            -- Simple Product
            SELECT price, sale_price, stock_quantity, name
            INTO v_product
            FROM public.products
            WHERE id = v_item.id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product with ID % not found', v_item.id;
            END IF;

            IF v_product.stock_quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Product "%" is out of stock. Available: %', v_product.name, v_product.stock_quantity;
            END IF;

            v_price := COALESCE(v_product.sale_price, v_product.price);

            UPDATE public.products
            SET
                stock_quantity = stock_quantity - v_item.quantity,
                reserved_stock = COALESCE(reserved_stock, 0) + v_item.quantity,
                updated_at = NOW()
            WHERE id = v_item.id;

            INSERT INTO public.inventory_transactions (
                product_id,
                type,
                quantity,
                before_stock,
                after_stock,
                reference_id,
                reference_type
            )
            VALUES (
                v_item.id,
                'RESERVATION',
                v_item.quantity,
                v_product.stock_quantity,
                v_product.stock_quantity - v_item.quantity,
                v_order_id,
                'ORDER'
            );
        END IF;

        -- Reservation
        INSERT INTO public.inventory_reservations (
            order_id,
            product_id,
            variant_id,
            quantity,
            expires_at,
            status
        )
        VALUES (
            v_order_id,
            v_item.id,
            v_item.variant_id,
            v_item.quantity,
            v_expires_at,
            'ACTIVE'
        );

        -- Order Item
        INSERT INTO public.order_items (
            order_id,
            product_id,
            variant_id,
            quantity,
            unit_price
        )
        VALUES (
            v_order_id,
            v_item.id,
            v_item.variant_id,
            v_item.quantity,
            v_price
        );

        v_subtotal := v_subtotal + (v_price * v_item.quantity);
    END LOOP;

    -- Validate and apply coupon if provided
    IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
        SELECT *
        INTO v_coupon
        FROM public.coupons
        WHERE code = UPPER(TRIM(p_coupon_code))
          AND active = true
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Coupon code "%" is invalid or inactive', p_coupon_code;
        END IF;

        IF v_coupon.start_date IS NOT NULL AND NOW() < v_coupon.start_date THEN
            RAISE EXCEPTION 'Coupon code "%" is not active yet', p_coupon_code;
        END IF;

        IF v_coupon.expiration_date IS NOT NULL AND NOW() > v_coupon.expiration_date THEN
            RAISE EXCEPTION 'Coupon code "%" has expired', p_coupon_code;
        END IF;

        IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
            RAISE EXCEPTION 'Coupon code "%" has reached its usage limit', p_coupon_code;
        END IF;

        IF v_subtotal < v_coupon.min_order_amount THEN
            RAISE EXCEPTION 'Coupon "%" requires a minimum purchase of ₹%', p_coupon_code, v_coupon.min_order_amount;
        END IF;

        IF v_coupon.discount_type = 'percentage' THEN
            v_discount_amount := v_subtotal * (v_coupon.discount_value / 100.0);
            IF v_coupon.max_discount_amount IS NOT NULL THEN
                v_discount_amount := LEAST(v_discount_amount, v_coupon.max_discount_amount);
            END IF;
        ELSIF v_coupon.discount_type = 'fixed' THEN
            v_discount_amount := v_coupon.discount_value;
        END IF;

        v_discount_amount := LEAST(v_discount_amount, v_subtotal);

        UPDATE public.coupons
        SET usage_count = usage_count + 1
        WHERE id = v_coupon.id;
    END IF;

    -- Calculate final amount
    v_total_amount := v_subtotal + v_delivery_charge - v_discount_amount;

    -- Validate EMI details if provided
    IF p_is_emi THEN
        SELECT *
        INTO v_emi_provider
        FROM public.emi_providers
        WHERE id = p_emi_provider_id AND status = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected EMI Provider is inactive or invalid';
        END IF;

        -- Check minimum order amount for provider
        IF v_total_amount < v_emi_provider.min_order_amount THEN
            RAISE EXCEPTION 'Order amount ₹% is less than the minimum required ₹% for % EMI', 
                            v_total_amount, v_emi_provider.min_order_amount, v_emi_provider.name;
        END IF;

        SELECT *
        INTO v_emi_plan
        FROM public.emi_plans
        WHERE id = p_emi_plan_id AND provider_id = p_emi_provider_id AND active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected EMI Plan is inactive or invalid';
        END IF;

        -- Validate tenure and interest rate
        IF v_emi_plan.tenure_months <> p_emi_tenure OR v_emi_plan.interest_rate <> p_emi_interest_rate THEN
            RAISE EXCEPTION 'EMI Plan details mismatch';
        END IF;

        -- Verify EMI math
        IF p_emi_interest_rate = 0 THEN
            v_calculated_emi := ROUND(v_total_amount / p_emi_tenure::numeric, 2);
            v_calculated_total_payable := v_total_amount;
        ELSE
            v_r := p_emi_interest_rate / 12.0 / 100.0;
            v_power := (1.0 + v_r) ^ p_emi_tenure;
            v_calculated_emi := ROUND((v_total_amount * v_r * v_power) / (v_power - 1.0), 2);
            v_calculated_total_payable := ROUND(v_calculated_emi * p_emi_tenure, 2);
        END IF;

        -- Allow a tolerance of 5.00 INR for rounding differences
        IF ABS(v_calculated_emi - p_emi_monthly_installment) > 5.00 OR ABS(v_calculated_total_payable - p_emi_total_payable) > 5.00 THEN
            RAISE EXCEPTION 'EMI calculation mismatch. Calculated EMI: %, Client EMI: %', v_calculated_emi, p_emi_monthly_installment;
        END IF;
    END IF;

    -- COD Limit Check
    IF p_payment_method = 'COD' AND v_total_amount > 10000 THEN
        RAISE EXCEPTION 'Cash on Delivery is not available for orders above ₹10,000';
    END IF;

    -- Update final amount and coupon details
    UPDATE public.orders
    SET
        total_amount = v_total_amount,
        coupon_code = CASE WHEN v_discount_amount > 0 THEN UPPER(TRIM(p_coupon_code)) ELSE NULL END,
        discount_amount = v_discount_amount,
        is_emi = p_is_emi,
        emi_provider_id = p_emi_provider_id,
        emi_plan_id = p_emi_plan_id,
        emi_tenure = p_emi_tenure,
        emi_monthly_installment = p_emi_monthly_installment,
        emi_interest_rate = p_emi_interest_rate,
        emi_total_payable = p_emi_total_payable,
        emi_details = p_emi_details,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Initial status history
    INSERT INTO public.order_status_history (
        order_id,
        old_status,
        new_status,
        actor_type,
        actor_id,
        remarks
    )
    VALUES (
        v_order_id,
        NULL,
        v_order_status,
        'customer',
        p_user_id,
        CASE
            WHEN p_payment_method = 'COD'
            THEN 'COD order placed and confirmed'
            ELSE 'Order placed awaiting payment'
        END
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'status', v_order_status,
        'payment_status', v_payment_status,
        'total_amount', v_total_amount
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;$function$;

-- 8. Seed default EMI Providers & Plans
INSERT INTO public.emi_providers (id, name, code, min_order_amount, status)
VALUES
  ('a881335b-1793-41bb-9878-1a5b43aa1b01', 'HDFC Bank Credit Card', 'hdfc_cc', 3000, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b02', 'ICICI Bank Credit Card', 'icici_cc', 3000, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b03', 'Bajaj Finserv EMI Card', 'bajaj_finserv', 5000, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.emi_plans (provider_id, tenure_months, interest_rate, active)
VALUES
  -- HDFC CC Plans (No cost for 3M, interest for 6M/12M)
  ('a881335b-1793-41bb-9878-1a5b43aa1b01', 3, 0.00, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b01', 6, 14.00, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b01', 12, 15.00, true),
  -- ICICI CC Plans (No cost for 3M, interest for 6M/12M)
  ('a881335b-1793-41bb-9878-1a5b43aa1b02', 3, 0.00, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b02', 6, 13.00, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b02', 12, 14.00, true),
  -- Bajaj Finserv Plans (All No Cost EMI)
  ('a881335b-1793-41bb-9878-1a5b43aa1b03', 3, 0.00, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b03', 6, 0.00, true),
  ('a881335b-1793-41bb-9878-1a5b43aa1b03', 9, 0.00, true)
ON CONFLICT DO NOTHING;
