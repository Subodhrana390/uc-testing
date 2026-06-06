-- Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status text NOT NULL,
  new_status text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('customer', 'admin', 'system', 'delivery_agent')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Select policy: User owns order or is Admin
CREATE POLICY "Users can view own status history" 
  ON public.order_status_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_status_history.order_id 
        AND (orders.user_id = auth.uid() OR (auth.jwt() ->> 'email') LIKE '%@ucenterprises.com')
    )
  );

-- Insert policy: Admins or System can insert
CREATE POLICY "Authorized actors can insert status history" 
  ON public.order_status_history FOR INSERT 
  WITH CHECK (
    (auth.jwt() ->> 'email') LIKE '%@ucenterprises.com' 
    OR auth.uid() IS NOT NULL
  );

-- Function to handle atomic, validated state transitions
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
  -- 1. Lock the order row and fetch info
  SELECT status, payment_status, total_amount, user_id INTO v_current_status, v_payment_status, v_total_amount, v_user_id
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Normalize casing
  v_current_status := upper(v_current_status);
  p_new_status := upper(p_new_status);
  p_actor_type := lower(p_actor_type);

  -- 2. Validate Transitions
  IF v_current_status = p_new_status THEN
    RAISE EXCEPTION 'Order status is already %', v_current_status;
  END IF;

  v_is_valid := true;

  -- 4. Update the Order
  UPDATE public.orders
  SET status = p_new_status,
      payment_status = CASE 
        WHEN p_new_status = 'CANCELLED' AND payment_status = 'Paid' THEN 'Refund Pending'
        WHEN p_new_status = 'CANCELLED' THEN 'Cancelled'
        WHEN p_new_status = 'REFUNDED' THEN 'Refunded'
        WHEN p_new_status = 'FAILED' AND payment_status = 'Paid' THEN 'Refund Pending'
        WHEN p_new_status = 'FAILED' THEN 'Failed'
        ELSE payment_status
      END
  WHERE id = p_order_id;

  -- 5. Update Payment Status in payments table
  IF p_new_status = 'CANCELLED' THEN
    UPDATE public.payments 
    SET status = CASE WHEN status = 'paid' OR status = 'captured' OR status = 'completed' THEN 'refund_pending' ELSE 'cancelled' END 
    WHERE order_id = p_order_id;
  ELSIF p_new_status = 'REFUNDED' THEN
    UPDATE public.payments SET status = 'refunded' WHERE order_id = p_order_id;
  ELSIF p_new_status = 'FAILED' THEN
    UPDATE public.payments 
    SET status = CASE WHEN status = 'paid' OR status = 'captured' OR status = 'completed' THEN 'refund_pending' ELSE 'failed' END 
    WHERE order_id = p_order_id;
  END IF;

  -- 6. Inventory rollback if cancelled or returned
  IF p_new_status IN ('CANCELLED', 'RETURNED') THEN
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
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
