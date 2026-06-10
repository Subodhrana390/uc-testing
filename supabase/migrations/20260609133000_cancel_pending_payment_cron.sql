-- 1. Create function to cancel pending online payment orders
CREATE OR REPLACE FUNCTION public.cancel_pending_payment_orders()
RETURNS void AS $$
DECLARE
    v_order record;
    v_res jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create with the actual implementation
CREATE OR REPLACE FUNCTION public.cancel_pending_payment_orders()
RETURNS void AS $$
DECLARE
    v_order record;
    v_res jsonb;
BEGIN
    FOR v_order IN 
        SELECT id, user_id 
        FROM public.orders 
        WHERE status = 'PENDING' 
          AND payment_method = 'ONLINE' 
          AND created_at < now() - interval '30 minutes'
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Transition order to CANCELLED via the state machine
        v_res := public.transition_order_status(
            v_order.id,
            'CANCELLED',
            'system',
            v_order.user_id,
            'Online payment pending timeout (cancelled automatically by system)'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Schedule the cron job (Runs every 5 minutes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cancel-pending-payment-orders',
      '*/5 * * * *', -- Every 5 minutes
      'SELECT public.cancel_pending_payment_orders();'
    );
  END IF;
END $$;

-- 3. Modify release_expired_reservations to use transition_order_status to avoid double release
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS void AS $$
DECLARE
    v_res record;
    v_user_id uuid;
    v_temp jsonb;
BEGIN
    -- Find all DISTINCT orders with ACTIVE reservations where expires_at has passed
    FOR v_res IN 
        SELECT DISTINCT r.order_id, o.user_id
        FROM public.inventory_reservations r
        JOIN public.orders o ON r.order_id = o.id
        WHERE r.status = 'ACTIVE' AND r.expires_at < now()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Transition order to CANCELLED via the state machine
        -- This automatically handles inventory release, transactions, and reservation status to RELEASED
        v_temp := public.transition_order_status(
            v_res.order_id,
            'CANCELLED',
            'system',
            v_res.user_id,
            'Reservation expired (cancelled automatically by system)'
        );
        
        -- Fallback: If transition_order_status failed or if reservation was not released,
        -- mark reservation as EXPIRED to prevent infinite loops
        UPDATE public.inventory_reservations 
        SET status = 'EXPIRED', updated_at = now() 
        WHERE order_id = v_res.order_id AND status = 'ACTIVE';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
