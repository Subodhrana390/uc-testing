-- 1. Create function to recalculate a single product's sale price based on active deals
CREATE OR REPLACE FUNCTION public.recalculate_product_sale_price(p_product_id UUID)
RETURNS VOID AS $$
DECLARE
    v_best_discount NUMERIC;
    v_original_price NUMERIC;
    v_new_sale_price NUMERIC;
BEGIN
    -- Get product's original price
    SELECT price INTO v_original_price FROM public.products WHERE id = p_product_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Find the highest discount percentage among active deals for this product
    SELECT MAX(discount_percentage)
    INTO v_best_discount
    FROM public.deals
    WHERE product_id = p_product_id
      AND status = true
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW());

    IF v_best_discount IS NOT NULL AND v_best_discount > 0 THEN
        -- Calculate discounted price
        v_new_sale_price := v_original_price - (v_original_price * (v_best_discount / 100.0));
        -- Update product sale price
        UPDATE public.products
        SET sale_price = v_new_sale_price, updated_at = NOW()
        WHERE id = p_product_id;
    ELSE
        -- If no active deal exists but there was a deal associated with this product, set sale_price to NULL.
        -- We only set to NULL if there is at least one deal (active or inactive) in the deals table for this product,
        -- so that we don't clear manually set sale prices of products that have never had deals.
        IF EXISTS (SELECT 1 FROM public.deals WHERE product_id = p_product_id) THEN
            UPDATE public.products
            SET sale_price = NULL, updated_at = NOW()
            WHERE id = p_product_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to sync all active deals
CREATE OR REPLACE FUNCTION public.sync_all_active_deals()
RETURNS VOID AS $$
DECLARE
    v_prod record;
BEGIN
    FOR v_prod IN SELECT DISTINCT product_id FROM public.deals WHERE product_id IS NOT NULL LOOP
        PERFORM public.recalculate_product_sale_price(v_prod.product_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create deal change trigger function
CREATE OR REPLACE FUNCTION public.on_deal_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle insert/update
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.product_id IS NOT NULL THEN
            PERFORM public.recalculate_product_sale_price(NEW.product_id);
        END IF;
        -- If product_id was changed, recalculate for the old one too
        IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT NULL AND OLD.product_id <> COALESCE(NEW.product_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
            PERFORM public.recalculate_product_sale_price(OLD.product_id);
        END IF;
    END IF;

    -- Handle delete
    IF TG_OP = 'DELETE' THEN
        IF OLD.product_id IS NOT NULL THEN
            PERFORM public.recalculate_product_sale_price(OLD.product_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on deals table
DROP TRIGGER IF EXISTS deal_change_trigger ON public.deals;
CREATE TRIGGER deal_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.on_deal_change();

-- 5. Create trigger function for product price change
CREATE OR REPLACE FUNCTION public.on_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        PERFORM public.recalculate_product_sale_price(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger on products table
DROP TRIGGER IF EXISTS product_price_change_trigger ON public.products;
CREATE TRIGGER product_price_change_trigger
AFTER UPDATE OF price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.on_product_price_change();

-- 7. Schedule the cron job (Runs every 1 minute)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule if already scheduled
    PERFORM cron.unschedule('sync-all-active-deals');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Handle if cron.unschedule throws when it doesn't exist
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'sync-all-active-deals',
      '*/1 * * * *', -- Every 1 minute
      'SELECT public.sync_all_active_deals();'
    );
  END IF;
END $$;

-- 8. Recalculate all products currently to ensure correct initial state
SELECT public.sync_all_active_deals();
