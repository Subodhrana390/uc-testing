-- Strict Order State Machine Implementation

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
BEGIN
  -- 1. Lock the order row
  SELECT status, payment_status, total_amount, user_id 
  INTO v_current_status, v_payment_status, v_total_amount, v_user_id
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_current_status := upper(v_current_status);
  p_new_status := upper(p_new_status);
  p_actor_type := lower(p_actor_type);

  IF v_current_status = p_new_status THEN
    RAISE EXCEPTION 'Order status is already %', v_current_status;
  END IF;

  -- 2. Strict State Transition Logic (Directed Acyclic Graph)
  CASE v_current_status
    WHEN 'PENDING_PAYMENT', 'PENDING' THEN
      v_is_valid := p_new_status IN ('PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CANCELLED', 'PLACED');
    WHEN 'PAYMENT_PROCESSING' THEN
      v_is_valid := p_new_status IN ('PAYMENT_SUCCESS', 'PAYMENT_FAILED');
    WHEN 'PAYMENT_SUCCESS', 'PLACED' THEN
      v_is_valid := p_new_status IN ('ORDER_CONFIRMED', 'CANCELLED', 'REFUNDED');
    WHEN 'PAYMENT_FAILED', 'FAILED' THEN
      v_is_valid := p_new_status IN ('CANCELLED'); -- Can only be cancelled
    WHEN 'ORDER_CONFIRMED' THEN
      v_is_valid := p_new_status IN ('PROCESSING', 'CANCELLED');
    WHEN 'PROCESSING' THEN
      v_is_valid := p_new_status IN ('SHIPPED');
    WHEN 'SHIPPED' THEN
      v_is_valid := p_new_status IN ('DELIVERED', 'RETURN_REQUESTED');
    WHEN 'DELIVERED' THEN
      v_is_valid := p_new_status IN ('RETURN_REQUESTED');
    WHEN 'RETURN_REQUESTED' THEN
      v_is_valid := p_new_status IN ('RETURN_APPROVED', 'RETURN_REJECTED');
    WHEN 'RETURN_APPROVED' THEN
      v_is_valid := p_new_status IN ('RETURN_RECEIVED');
    WHEN 'RETURN_RECEIVED' THEN
      v_is_valid := p_new_status IN ('REFUNDED');
    WHEN 'CANCELLED', 'REFUNDED' THEN
      -- Terminal states
      IF (p_actor_type = 'admin') THEN
         v_is_valid := true; -- Admin override allowed but generally not recommended
      ELSE
         v_is_valid := false;
      END IF;
    ELSE
      v_is_valid := false;
  END CASE;

  IF NOT v_is_valid AND p_actor_type != 'admin' THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', v_current_status, p_new_status;
  END IF;

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
    UPDATE public.payments 
    SET status = CASE WHEN status IN ('paid', 'completed', 'captured') THEN 'refund_pending' ELSE 'cancelled' END 
    WHERE order_id = p_order_id;
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
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity,
          reserved_stock = GREATEST(reserved_stock - v_item.quantity, 0)
      WHERE id = v_item.product_id;
    END LOOP;
  ELSIF p_new_status = 'SHIPPED' THEN
    -- Shipped: Reserved stock becomes sold. We subtract from reserved_stock.
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
      UPDATE public.products
      SET reserved_stock = GREATEST(reserved_stock - v_item.quantity, 0)
      WHERE id = v_item.product_id;
    END LOOP;
  ELSIF p_new_status = 'RETURN_RECEIVED' THEN
    -- Returned item comes back to returned_stock
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
      UPDATE public.products
      SET returned_stock = returned_stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 7. Log history
  INSERT INTO public.order_status_history (
    order_id,
    old_status,
    new_status,
    actor_type,
    actor_id,
    remarks
  ) VALUES (
    p_order_id,
    v_current_status,
    p_new_status,
    p_actor_type,
    p_actor_id,
    p_remarks
  );

  v_result := jsonb_build_object('success', true);
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object('success', false, 'error', SQLERRM);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
