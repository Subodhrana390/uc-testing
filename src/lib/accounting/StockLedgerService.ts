import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type StockTransactionType = 'SALE' | 'PURCHASE' | 'RETURN_IN' | 'RETURN_OUT' | 'ADJUSTMENT' | 'DAMAGE' | 'EXPIRED' | 'TRANSFER';

export class StockLedgerService {
  /**
   * Manually records a stock movement and updates the current inventory balance.
   */
  public static async recordStockMovement(
    productId: string,
    variantId: string | null,
    type: StockTransactionType,
    quantityChange: number, // Positive for incoming, negative for outgoing
    referenceId?: string,
    referenceType?: string,
    notes?: string,
    adminUserId?: string
  ): Promise<void> {
    const supabase = createServiceRoleClient();

    const table = variantId ? 'product_variants' : 'products';
    const id = variantId || productId;

    // 1. Fetch Current Stock
    const { data: currentProduct, error: fetchError } = await supabase
      .from(table)
      .select('stock_quantity')
      .eq('id', id)
      .single();

    if (fetchError || !currentProduct) throw new Error(`Product not found for ID: ${id}`);

    const beforeStock = currentProduct.stock_quantity || 0;
    const afterStock = beforeStock + quantityChange;

    if (afterStock < 0) {
      throw new Error(`Insufficient stock. Current: ${beforeStock}, Attempted to deduct: ${Math.abs(quantityChange)}`);
    }

    // 2. Update Stock
    const { error: updateError } = await supabase
      .from(table)
      .update({ stock_quantity: afterStock })
      .eq('id', id);

    if (updateError) throw new Error(`Failed to update stock: ${updateError.message}`);

    // 3. Log to Ledger (inventory_transactions)
    const { error: logError } = await supabase.from('inventory_transactions').insert({
      product_id: productId,
      variant_id: variantId,
      type: type,
      quantity: quantityChange, // Signed integer
      before_stock: beforeStock,
      after_stock: afterStock,
      reference_id: referenceId,
      reference_type: referenceType,
      notes: notes,
      created_by: adminUserId
    });

    if (logError) throw new Error(`Failed to log stock movement: ${logError.message}`);
  }
}
