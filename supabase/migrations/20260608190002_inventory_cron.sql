-- 1. Create function to release expired reservations
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS void AS $$
DECLARE
    v_res record;
    v_after_stock int;
BEGIN
    -- Find all ACTIVE reservations where expires_at has passed
    FOR v_res IN 
        SELECT id, order_id, product_id, variant_id, quantity 
        FROM public.inventory_reservations 
        WHERE status = 'ACTIVE' AND expires_at < now()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- If it's a variant reservation
        IF v_res.variant_id IS NOT NULL THEN
            UPDATE public.product_variants 
            SET stock_quantity = stock_quantity + v_res.quantity, 
                reserved_stock = GREATEST(reserved_stock - v_res.quantity, 0) 
            WHERE id = v_res.variant_id 
            RETURNING stock_quantity INTO v_after_stock;

            INSERT INTO public.inventory_transactions 
                (product_id, variant_id, type, quantity, before_stock, after_stock, reference_id, reference_type, notes) 
            VALUES 
                (v_res.product_id, v_res.variant_id, 'RELEASE', v_res.quantity, v_after_stock - v_res.quantity, v_after_stock, v_res.order_id, 'ORDER', 'Auto-released by background job');
        ELSE
            -- Product reservation
            UPDATE public.products 
            SET stock_quantity = stock_quantity + v_res.quantity, 
                reserved_stock = GREATEST(reserved_stock - v_res.quantity, 0) 
            WHERE id = v_res.product_id 
            RETURNING stock_quantity INTO v_after_stock;

            INSERT INTO public.inventory_transactions 
                (product_id, type, quantity, before_stock, after_stock, reference_id, reference_type, notes) 
            VALUES 
                (v_res.product_id, 'RELEASE', v_res.quantity, v_after_stock - v_res.quantity, v_after_stock, v_res.order_id, 'ORDER', 'Auto-released by background job');
        END IF;

        -- Update reservation status
        UPDATE public.inventory_reservations 
        SET status = 'EXPIRED', updated_at = now() 
        WHERE id = v_res.id;

        -- Optionally update order status to FAILED or CANCELLED if it was pending payment
        UPDATE public.orders 
        SET status = 'CANCELLED', payment_status = 'Failed', updated_at = now() 
        WHERE id = v_res.order_id AND status = 'PENDING_PAYMENT';
        
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Schedule the cron job (Runs every minute)
-- Note: Requires pg_cron extension. Supabase Platform enables this by default.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'release-expired-reservations',
      '* * * * *', -- Every minute
      'SELECT public.release_expired_reservations();'
    );
  END IF;
END $$;
