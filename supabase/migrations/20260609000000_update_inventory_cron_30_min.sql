-- Update place_order_safe function to handle 30 minute expiration instead of 15 minutes
CREATE OR REPLACE FUNCTION public.place_order_safe(
    p_user_id uuid,
    p_customer_name text,
    p_customer_email text,
    p_phone text,
    p_shipping_address text,
    p_payment_method text,
    p_items jsonb, -- Array of { id: uuid, variant_id: uuid (optional), quantity: int }
    p_delivery_estimate text DEFAULT NULL,
    p_idempotency_key text DEFAULT NULL,
    p_attribution jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
    v_order_id uuid;
    v_total_amount numeric := 0;
    v_delivery_charge numeric := 50;
    v_item record;
    v_product record;
    v_variant record;
    v_cod_rejections int := 0;
    v_order_status text := 'PENDING_PAYMENT';
    v_payment_status text := 'Unpaid';
    v_expires_at timestamptz := now() + interval '30 minutes';
    v_price numeric;
BEGIN
    -- 1. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'message', 'Order already exists for this idempotency key');
        END IF;
    END IF;

    -- 2. COD Validation
    IF p_payment_method = 'COD' THEN
        SELECT cod_rejections INTO v_cod_rejections FROM public.profiles WHERE id = p_user_id;
        IF v_cod_rejections >= 3 THEN
            RAISE EXCEPTION 'Cash on Delivery is disabled for this account due to excessive rejections.';
        END IF;
        v_order_status := 'ORDER_CONFIRMED';
    END IF;

    -- Create Order early so we can link reservations
    -- We'll update total_amount later
    INSERT INTO public.orders (
        user_id, customer_name, customer_email, phone, shipping_address,
        total_amount, payment_method, payment_status, status, delivery_estimate, idempotency_key
    ) VALUES (
        p_user_id, p_customer_name, p_customer_email, p_phone, p_shipping_address,
        0, p_payment_method, v_payment_status, v_order_status, p_delivery_estimate, p_idempotency_key
    ) RETURNING id INTO v_order_id;

    -- 3. Calculate Total and Reserve Inventory
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, variant_id uuid, quantity int) LOOP
        
        IF v_item.variant_id IS NOT NULL THEN
            -- Lock Variant
            SELECT price, sale_price, stock_quantity, name INTO v_variant
            FROM public.product_variants WHERE id = v_item.variant_id FOR UPDATE;

            IF v_variant IS NULL THEN RAISE EXCEPTION 'Variant with ID % not found', v_item.variant_id; END IF;
            IF v_variant.stock_quantity < v_item.quantity THEN RAISE EXCEPTION 'Variant "%" is out of stock. Available: %', v_variant.name, v_variant.stock_quantity; END IF;

            v_price := COALESCE(v_variant.sale_price, v_variant.price);

            UPDATE public.product_variants SET 
                stock_quantity = stock_quantity - v_item.quantity,
                reserved_stock = reserved_stock + v_item.quantity
            WHERE id = v_item.variant_id;

            INSERT INTO public.inventory_transactions (product_id, variant_id, type, quantity, before_stock, after_stock, reference_id, reference_type)
            VALUES (v_item.id, v_item.variant_id, 'RESERVATION', v_item.quantity, v_variant.stock_quantity, v_variant.stock_quantity - v_item.quantity, v_order_id, 'ORDER');

        ELSE
            -- Lock Product
            SELECT price, sale_price, stock_quantity, name INTO v_product
            FROM public.products WHERE id = v_item.id FOR UPDATE;

            IF v_product IS NULL THEN RAISE EXCEPTION 'Product with ID % not found', v_item.id; END IF;
            IF v_product.stock_quantity < v_item.quantity THEN RAISE EXCEPTION 'Product "%" is out of stock. Available: %', v_product.name, v_product.stock_quantity; END IF;

            v_price := COALESCE(v_product.sale_price, v_product.price);

            UPDATE public.products SET 
                stock_quantity = stock_quantity - v_item.quantity,
                reserved_stock = reserved_stock + v_item.quantity
            WHERE id = v_item.id;

            INSERT INTO public.inventory_transactions (product_id, type, quantity, before_stock, after_stock, reference_id, reference_type)
            VALUES (v_item.id, 'RESERVATION', v_item.quantity, v_product.stock_quantity, v_product.stock_quantity - v_item.quantity, v_order_id, 'ORDER');
        END IF;

        -- Create Reservation Record
        INSERT INTO public.inventory_reservations (order_id, product_id, variant_id, quantity, expires_at, status)
        VALUES (v_order_id, v_item.id, v_item.variant_id, v_item.quantity, v_expires_at, 'ACTIVE');

        -- Create Order Item
        INSERT INTO public.order_items (order_id, product_id, variant_id, quantity, unit_price)
        VALUES (v_order_id, v_item.id, v_item.variant_id, v_item.quantity, v_price);

        v_total_amount := v_total_amount + (v_price * v_item.quantity);
    END LOOP;

    v_total_amount := v_total_amount + v_delivery_charge;

    IF p_payment_method = 'COD' AND v_total_amount > 10000 THEN
        RAISE EXCEPTION 'Cash on Delivery is not available for orders above ₹10,000';
    END IF;

    -- Update Order Total
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    -- 7. Insert Initial Status History
    INSERT INTO public.order_status_history (
        order_id, old_status, new_status, actor_type, actor_id, remarks
    ) VALUES (
        v_order_id, 'NEW', v_order_status, 'customer', p_user_id, 'Order placed via place_order_safe'
    );

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'total_amount', v_total_amount);

EXCEPTION WHEN OTHERS THEN
    -- Transaction rolls back automatically, locks are released
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
