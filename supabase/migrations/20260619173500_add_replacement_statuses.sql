-- Drop old function
DROP FUNCTION IF EXISTS public.transition_order_status(
    uuid, text, text, uuid, text
);

-- Re-create the transition_order_status function with REPLACEMENT transitions
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id uuid,
  p_new_status text,
  p_actor_type text,
  p_actor_id uuid,
  p_remarks text
)
RETURNS jsonb
SECURITY DEFINER
AS $$
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
              'RETURN_REQUESTED',
              'REPLACEMENT_REQUESTED'
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

      WHEN 'REPLACEMENT_REQUESTED' THEN
          v_is_valid := p_new_status IN (
              'REPLACEMENT_APPROVED',
              'DELIVERED'
          );

      WHEN 'REPLACEMENT_APPROVED' THEN
          v_is_valid := p_new_status IN (
              'REPLACED'
          );

      WHEN 'REPLACED' THEN
          v_is_valid := FALSE;

      WHEN 'CANCELLED', 'REFUNDED', 'FAILED' THEN
          v_is_valid := FALSE;

      ELSE
          v_is_valid := FALSE;
  END CASE;

  -- Prevent invalid transitions
  IF NOT v_is_valid AND p_actor_type != 'admin' THEN
      RAISE EXCEPTION
          'Invalid state transition from % to %',
          v_current_status,
          p_new_status;
  END IF;

  UPDATE public.orders
  SET
      status = p_new_status,
      payment_status = CASE
          WHEN p_new_status IN ('CANCELLED', 'FAILED')
               AND v_payment_status = 'PAID'
              THEN 'REFUND_PENDING'

          WHEN p_new_status IN ('CANCELLED', 'FAILED')
              THEN p_new_status

          WHEN p_new_status = 'REFUND_PENDING'
              THEN 'REFUND_PENDING'

          WHEN p_new_status = 'REFUNDED'
              THEN 'REFUNDED'

          ELSE payment_status
      END,
      updated_at = NOW()
  WHERE id = p_order_id;

  IF p_new_status IN ('CANCELLED', 'FAILED') THEN
    UPDATE public.payments SET status = CASE WHEN status IN ('paid', 'completed', 'captured') THEN 'refund_pending' ELSE 'cancelled' END WHERE order_id = p_order_id;
  ELSIF p_new_status = 'REFUNDED' THEN
    UPDATE public.payments SET status = 'refunded' WHERE order_id = p_order_id;
  ELSIF p_new_status IN ('PAYMENT_FAILED', 'FAILED') THEN
    UPDATE public.payments SET status = 'failed' WHERE order_id = p_order_id AND status = 'pending';
  ELSIF p_new_status IN ('PAYMENT_SUCCESS', 'PLACED') THEN
    UPDATE public.payments SET status = 'completed' WHERE order_id = p_order_id AND status = 'pending';
  END IF;

  IF p_new_status IN ('CANCELLED', 'FAILED') THEN
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

  IF p_new_status IN ('CANCELLED', 'FAILED') THEN
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
$$ LANGUAGE plpgsql;
