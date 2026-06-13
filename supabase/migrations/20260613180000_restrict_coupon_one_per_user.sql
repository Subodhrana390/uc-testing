-- Migration to restrict coupons to one use per user (excluding cancelled orders)
-- Also updates transition_order_status to revert the global usage count of a coupon when an order is cancelled.

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
    p_emi_details jsonb DEFAULT NULL,
    p_tax_amount numeric DEFAULT 0,
    p_shipping_amount numeric DEFAULT 0
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $function$DECLARE
    v_order_id UUID;
    v_total_amount NUMERIC := 0;
    v_subtotal NUMERIC := 0;
    v_delivery_charge NUMERIC := COALESCE(p_shipping_amount, 0);
    v_tax_amount NUMERIC := COALESCE(p_tax_amount, 0);
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
        tax_amount,
        shipping_amount,
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
        v_tax_amount,
        v_delivery_charge,
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

        -- Check if the user has already used this coupon code (excluding cancelled orders)
        IF EXISTS (
            SELECT 1 FROM public.orders
            WHERE user_id = p_user_id
              AND coupon_code = UPPER(TRIM(p_coupon_code))
              AND status <> 'CANCELLED'
        ) THEN
            RAISE EXCEPTION 'Coupon code "%" has already been used by you', p_coupon_code;
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

    -- Calculate final amount (Note: v_subtotal already includes tax for tax-inclusive items)
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
        tax_amount = v_tax_amount,
        shipping_amount = v_delivery_charge,
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


CREATE OR REPLACE FUNCTION public.transition_order_status(
    p_order_id uuid,
    p_new_status text,
    p_actor_type text,
    p_actor_id uuid,
    p_remarks text DEFAULT NULL::text
)
RETURNS jsonb AS $$
DECLARE
  v_current_status text;
  v_payment_status text;
  v_total_amount numeric;
  v_user_id uuid;
  v_current_coupon_code text;
  v_item record;
  v_is_valid boolean := false;
  v_result jsonb;
  v_before_stock int;
  v_after_stock int;
  v_invoice_id uuid;
BEGIN
  SELECT status, payment_status, total_amount, user_id, coupon_code
  INTO v_current_status, v_payment_status, v_total_amount, v_user_id, v_current_coupon_code
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_current_status := upper(v_current_status);
  p_new_status := upper(p_new_status);
  p_actor_type := lower(p_actor_type);

  IF v_current_status = 'ORDER_CONFIRMED' THEN v_current_status := 'CONFIRMED'; END IF;
  IF p_new_status = 'ORDER_CONFIRMED' THEN p_new_status := 'CONFIRMED'; END IF;

  IF v_current_status = p_new_status THEN RAISE EXCEPTION 'Order status is already %', v_current_status; END IF;

v_current_status := UPPER(v_current_status);
p_new_status := UPPER(p_new_status);
p_actor_type := LOWER(p_actor_type);

-- Validate transition
CASE v_current_status

    WHEN 'PENDING' THEN
        v_is_valid := p_new_status IN (
            'CONFIRMED',
            'CANCELLED',
            'FAILED'
        );

    WHEN 'CONFIRMED' THEN
        v_is_valid := p_new_status IN (
            'PROCESSING',
            'CANCELLED'
        );

    WHEN 'PROCESSING' THEN
        v_is_valid := p_new_status IN (
            'SHIPPED',
            'CANCELLED'
        );

    WHEN 'SHIPPED' THEN
        v_is_valid := p_new_status IN (
            'DELIVERED'
        );

    WHEN 'DELIVERED' THEN
        v_is_valid := p_new_status IN (
            'RETURN_REQUESTED'
        );

    WHEN 'RETURN_REQUESTED' THEN
        v_is_valid := p_new_status IN (
            'RETURN_APPROVED'
        );

    WHEN 'RETURN_APPROVED' THEN
        v_is_valid := p_new_status IN (
            'RETURNED'
        );

    WHEN 'RETURNED' THEN
        v_is_valid := p_new_status IN (
            'REFUND_PENDING'
        );

    WHEN 'REFUND_PENDING' THEN
        v_is_valid := p_new_status IN (
            'REFUNDED'
        );

    WHEN 'CANCELLED', 'REFUNDED', 'FAILED' THEN
        v_is_valid := FALSE;

    ELSE
        v_is_valid := FALSE;
END CASE;

-- Prevent invalid transitions
IF NOT v_is_valid THEN
    RAISE EXCEPTION
        'Invalid state transition from % to %',
        v_current_status,
        p_new_status;
END IF;

  IF NOT v_is_valid AND p_actor_type != 'admin' THEN RAISE EXCEPTION 'Invalid state transition from % to %', v_current_status, p_new_status; END IF;

UPDATE public.orders
SET
    status = p_new_status,
    payment_status = CASE
        WHEN p_new_status = 'CANCELLED'
             AND v_payment_status = 'PAID'
            THEN 'REFUND_PENDING'

        WHEN p_new_status = 'CANCELLED'
            THEN 'CANCELLED'

        WHEN p_new_status = 'REFUND_PENDING'
            THEN 'REFUND_PENDING'

        WHEN p_new_status = 'REFUNDED'
            THEN 'REFUNDED'

        WHEN p_new_status = 'FAILED'
            THEN 'FAILED'

        ELSE payment_status
    END,
    updated_at = NOW()
WHERE id = p_order_id;

  IF p_new_status = 'CANCELLED' THEN
    UPDATE public.payments SET status = CASE WHEN status IN ('paid', 'completed', 'captured') THEN 'refund_pending' ELSE 'cancelled' END WHERE order_id = p_order_id;
  ELSIF p_new_status = 'REFUNDED' THEN
    UPDATE public.payments SET status = 'refunded' WHERE order_id = p_order_id;
  ELSIF p_new_status IN ('PAYMENT_FAILED', 'FAILED') THEN
    UPDATE public.payments SET status = 'failed' WHERE order_id = p_order_id AND status = 'pending';
  ELSIF p_new_status IN ('PAYMENT_SUCCESS', 'PLACED') THEN
    UPDATE public.payments SET status = 'completed' WHERE order_id = p_order_id AND status = 'pending';
  END IF;

  IF p_new_status = 'CANCELLED' THEN
    -- Revert the global usage count of the coupon
    IF v_current_coupon_code IS NOT NULL THEN
      UPDATE public.coupons
      SET usage_count = GREATEST(usage_count - 1, 0)
      WHERE code = v_current_coupon_code;
    END IF;

    -- Skip items where product_id is NULL (e.g. deleted products)
    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = p_order_id AND product_id IS NOT NULL LOOP
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants SET stock_quantity = stock_quantity + v_item.quantity, reserved_stock = GREATEST(reserved_stock - v_item.quantity, 0) WHERE id = v_item.variant_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, variant_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, v_item.variant_id, 'RELEASE', v_item.quantity, v_after_stock - v_item.quantity, v_after_stock, p_order_id, 'ORDER');
      ELSE
        UPDATE public.products SET stock_quantity = stock_quantity + v_item.quantity, reserved_stock = GREATEST(reserved_stock - v_item.quantity, 0) WHERE id = v_item.product_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, 'RELEASE', v_item.quantity, v_after_stock - v_item.quantity, v_after_stock, p_order_id, 'ORDER');
      END IF;
    END LOOP;
    UPDATE public.inventory_reservations SET status = 'RELEASED', updated_at = now() WHERE order_id = p_order_id;

  ELSIF p_new_status = 'SHIPPED' THEN
    -- Skip items where product_id is NULL (e.g. deleted products)
    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = p_order_id AND product_id IS NOT NULL LOOP
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants SET reserved_stock = GREATEST(reserved_stock - v_item.quantity, 0) WHERE id = v_item.variant_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, variant_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, v_item.variant_id, 'SALE', v_item.quantity, v_after_stock, v_after_stock, p_order_id, 'ORDER');
      ELSE
        UPDATE public.products SET reserved_stock = GREATEST(reserved_stock - v_item.quantity, 0) WHERE id = v_item.product_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, 'SALE', v_item.quantity, v_after_stock, v_after_stock, p_order_id, 'ORDER');
      END IF;
    END LOOP;
    UPDATE public.inventory_reservations SET status = 'CONVERTED', updated_at = now() WHERE order_id = p_order_id;

  ELSIF p_new_status = 'RETURN_RECEIVED' THEN
    -- Skip items where product_id is NULL (e.g. deleted products)
    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = p_order_id AND product_id IS NOT NULL LOOP
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants SET stock_quantity = stock_quantity + v_item.quantity WHERE id = v_item.variant_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, variant_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, v_item.variant_id, 'RETURN', v_item.quantity, v_after_stock - v_item.quantity, v_after_stock, p_order_id, 'ORDER');
      ELSE
        UPDATE public.products SET returned_stock = returned_stock + v_item.quantity, stock_quantity = stock_quantity + v_item.quantity WHERE id = v_item.product_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, 'RETURN', v_item.quantity, v_after_stock - v_item.quantity, v_after_stock, p_order_id, 'ORDER');
      END IF;
    END LOOP;
  END IF;

  IF p_new_status IN ('PAYMENT_SUCCESS', 'PLACED') THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE order_id = p_order_id) THEN
      INSERT INTO public.invoices (
        invoice_number, order_id, user_id, status, subtotal, tax_amount, total_amount, issued_at
      )
      VALUES (
        public.generate_invoice_number(),
        p_order_id,
        v_user_id,
        CASE WHEN p_new_status = 'PAYMENT_SUCCESS' THEN 'PAID'::invoice_status_enum ELSE 'PENDING_PAYMENT'::invoice_status_enum END,
        v_total_amount,
        0,
        v_total_amount,
        now()
      ) RETURNING id INTO v_invoice_id;

      INSERT INTO public.invoice_items (
        invoice_id, product_id, variant_id, product_name, sku, quantity, unit_price, line_total
      )
      SELECT 
        v_invoice_id, 
        oi.product_id, 
        oi.variant_id, 
        COALESCE(pv.name, p.name, 'Unknown Product'), 
        COALESCE(pv.sku, p.id::text), 
        oi.quantity, 
        oi.unit_price, 
        oi.quantity * oi.unit_price
      FROM public.order_items oi
      LEFT JOIN public.products p ON oi.product_id = p.id
      LEFT JOIN public.product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = p_order_id;
      
    END IF;
  END IF;

  IF p_new_status = 'CANCELLED' THEN
    UPDATE public.invoices SET status = 'CANCELLED' WHERE order_id = p_order_id;
  END IF;

  IF p_new_status = 'REFUNDED' THEN
    UPDATE public.invoices SET status = 'REFUNDED' WHERE order_id = p_order_id RETURNING id INTO v_invoice_id;
    
    IF v_invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.credit_notes WHERE invoice_id = v_invoice_id) THEN
      INSERT INTO public.credit_notes (
        credit_note_number, invoice_id, refund_amount, reason
      ) VALUES (
        public.generate_credit_note_number(),
        v_invoice_id,
        v_total_amount,
        p_remarks
      );
    END IF;
  END IF;

  INSERT INTO public.order_status_history (
    order_id, old_status, new_status, actor_type, actor_id, remarks
  ) VALUES (p_order_id, v_current_status, p_new_status, p_actor_type, p_actor_id, p_remarks);

  v_result := jsonb_build_object('success', true);
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
      RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
