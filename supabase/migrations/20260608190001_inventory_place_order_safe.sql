-- 1. Modify Order Items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id);

-- 2. Update place_order_safe function to handle variants and create transactions
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


-- 3. Update transition_order_status for cancellations and reservations
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id uuid,
  p_new_status text,
  p_actor_type text,
  p_actor_id uuid,
  p_remarks text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_current_status text;
  v_payment_status text;
  v_total_amount numeric;
  v_user_id uuid;
  v_item record;
  v_is_valid boolean := false;
  v_result jsonb;
  v_before_stock int;
  v_after_stock int;
BEGIN
  -- 1. Lock the order row
  SELECT status, payment_status, total_amount, user_id 
  INTO v_current_status, v_payment_status, v_total_amount, v_user_id
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_current_status := upper(v_current_status);
  p_new_status := upper(p_new_status);
  p_actor_type := lower(p_actor_type);

  IF v_current_status = p_new_status THEN RAISE EXCEPTION 'Order status is already %', v_current_status; END IF;

  -- 2. Strict State Transition Logic (Directed Acyclic Graph)
  CASE v_current_status
    WHEN 'PENDING_PAYMENT', 'PENDING' THEN v_is_valid := p_new_status IN ('PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CANCELLED', 'PLACED');
    WHEN 'PAYMENT_PROCESSING' THEN v_is_valid := p_new_status IN ('PAYMENT_SUCCESS', 'PAYMENT_FAILED');
    WHEN 'PAYMENT_SUCCESS', 'PLACED' THEN v_is_valid := p_new_status IN ('ORDER_CONFIRMED', 'CANCELLED', 'REFUNDED');
    WHEN 'PAYMENT_FAILED', 'FAILED' THEN v_is_valid := p_new_status IN ('CANCELLED');
    WHEN 'ORDER_CONFIRMED' THEN v_is_valid := p_new_status IN ('PROCESSING', 'CANCELLED');
    WHEN 'PROCESSING' THEN v_is_valid := p_new_status IN ('SHIPPED');
    WHEN 'SHIPPED' THEN v_is_valid := p_new_status IN ('DELIVERED', 'RETURN_REQUESTED');
    WHEN 'DELIVERED' THEN v_is_valid := p_new_status IN ('RETURN_REQUESTED');
    WHEN 'RETURN_REQUESTED' THEN v_is_valid := p_new_status IN ('RETURN_APPROVED', 'RETURN_REJECTED');
    WHEN 'RETURN_APPROVED' THEN v_is_valid := p_new_status IN ('RETURN_RECEIVED');
    WHEN 'RETURN_RECEIVED' THEN v_is_valid := p_new_status IN ('REFUNDED');
    WHEN 'CANCELLED', 'REFUNDED' THEN
      IF (p_actor_type = 'admin') THEN v_is_valid := true; ELSE v_is_valid := false; END IF;
    ELSE v_is_valid := false;
  END CASE;

  IF NOT v_is_valid AND p_actor_type != 'admin' THEN RAISE EXCEPTION 'Invalid state transition from % to %', v_current_status, p_new_status; END IF;

  -- 4. Update the Order
  UPDATE public.orders
  SET status = p_new_status,
      payment_status = CASE 
        WHEN p_new_status = 'CANCELLED' AND v_payment_status IN ('Paid', 'PAYMENT_SUCCESS') THEN 'Refund Pending'
        WHEN p_new_status = 'CANCELLED' THEN 'Cancelled'
        WHEN p_new_status = 'REFUNDED' THEN 'Refunded'
        WHEN p_new_status = 'PAYMENT_FAILED' THEN 'Failed'
        WHEN p_new_status = 'PAYMENT_SUCCESS' THEN 'Paid'
        ELSE payment_status
      END,
      updated_at = now()
  WHERE id = p_order_id;

  -- 5. Update Payments table
  IF p_new_status = 'CANCELLED' THEN
    UPDATE public.payments SET status = CASE WHEN status IN ('paid', 'completed', 'captured') THEN 'refund_pending' ELSE 'cancelled' END WHERE order_id = p_order_id;
  ELSIF p_new_status = 'REFUNDED' THEN
    UPDATE public.payments SET status = 'refunded' WHERE order_id = p_order_id;
  ELSIF p_new_status IN ('PAYMENT_FAILED', 'FAILED') THEN
    UPDATE public.payments SET status = 'failed' WHERE order_id = p_order_id AND status = 'pending';
  ELSIF p_new_status IN ('PAYMENT_SUCCESS', 'PLACED') THEN
    UPDATE public.payments SET status = 'completed' WHERE order_id = p_order_id AND status = 'pending';
  END IF;

  -- 6. Inventory Logic
  IF p_new_status = 'CANCELLED' THEN
    -- Cancelled: Release reserved stock back to available stock
    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
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
    -- Shipped: Reserved stock becomes sold. We subtract from reserved_stock.
    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
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
    -- Returned item comes back to returned_stock or stock_quantity depending on business logic, here going to stock_quantity
    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants SET stock_quantity = stock_quantity + v_item.quantity WHERE id = v_item.variant_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, variant_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, v_item.variant_id, 'RETURN', v_item.quantity, v_after_stock - v_item.quantity, v_after_stock, p_order_id, 'ORDER');
      ELSE
        UPDATE public.products SET returned_stock = returned_stock + v_item.quantity, stock_quantity = stock_quantity + v_item.quantity WHERE id = v_item.product_id RETURNING stock_quantity INTO v_after_stock;
        INSERT INTO public.inventory_transactions (product_id, type, quantity, before_stock, after_stock, reference_id, reference_type) VALUES (v_item.product_id, 'RETURN', v_item.quantity, v_after_stock - v_item.quantity, v_after_stock, p_order_id, 'ORDER');
      END IF;
    END LOOP;
  END IF;

  -- 7. Log history
  INSERT INTO public.order_status_history (
    order_id, old_status, new_status, actor_type, actor_id, remarks
  ) VALUES (p_order_id, v_current_status, p_new_status, p_actor_type, p_actor_id, p_remarks);

  v_result := jsonb_build_object('success', true);
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object('success', false, 'error', SQLERRM);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
