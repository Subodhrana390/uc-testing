-- Atomic, Safe Order Placement RPC

CREATE OR REPLACE FUNCTION public.place_order_safe(
    p_user_id uuid,
    p_customer_name text,
    p_customer_email text,
    p_phone text,
    p_shipping_address text,
    p_payment_method text,
    p_items jsonb, -- Array of { id: uuid, quantity: int }
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
    v_cod_rejections int := 0;
    v_order_status text := 'PENDING_PAYMENT';
    v_payment_status text := 'Unpaid';
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
        v_order_status := 'ORDER_CONFIRMED'; -- COD orders go straight to confirmed
    END IF;

    -- 3. Calculate Total and Reserve Inventory
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, quantity int) LOOP
        -- Lock the product row
        SELECT price, stock_quantity, name INTO v_product
        FROM public.products
        WHERE id = v_item.id
        FOR UPDATE;

        IF v_product IS NULL THEN
            RAISE EXCEPTION 'Product with ID % not found', v_item.id;
        END IF;

        IF v_product.stock_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'Product "%" is out of stock. Available: %, Requested: %', v_product.name, v_product.stock_quantity, v_item.quantity;
        END IF;

        -- Update inventory (Atomic)
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_item.quantity,
            reserved_stock = reserved_stock + v_item.quantity
        WHERE id = v_item.id;

        -- Add to total (Price manipulation protection)
        v_total_amount := v_total_amount + (v_product.price * v_item.quantity);
    END LOOP;

    -- 4. Apply Delivery Charge & COD Limit
    v_total_amount := v_total_amount + v_delivery_charge;

    IF p_payment_method = 'COD' AND v_total_amount > 10000 THEN
        RAISE EXCEPTION 'Cash on Delivery is not available for orders above ₹10,000';
    END IF;

    -- 5. Create Order
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
    ) VALUES (
        p_user_id,
        p_customer_name,
        p_customer_email,
        p_phone,
        p_shipping_address,
        v_total_amount,
        p_payment_method,
        v_payment_status,
        v_order_status,
        p_delivery_estimate,
        p_idempotency_key
    ) RETURNING id INTO v_order_id;

    -- 6. Insert Order Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid, quantity int) LOOP
        -- We don't need to lock again, just read the price we used
        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            unit_price
        )
        SELECT 
            v_order_id,
            v_item.id,
            v_item.quantity,
            price
        FROM public.products WHERE id = v_item.id;
    END LOOP;

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
