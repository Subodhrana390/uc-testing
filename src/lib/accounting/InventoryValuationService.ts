import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { PurchaseOrder, PurchaseOrderItem } from "@/types/finance";

export class InventoryValuationService {
  /**
   * Calculates and updates the Weighted Average Cost when new inventory is received.
   * Also updates the current stock quantity and logs the transaction.
   */
  public static async receivePurchaseOrder(purchaseOrderId: string): Promise<void> {
    const supabase = createServiceRoleClient();

    // 1. Fetch Purchase Order and Items
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('id', purchaseOrderId)
      .single();

    if (poError || !po) throw new Error(`Purchase Order not found: ${poError?.message}`);
    if (po.status === 'RECEIVED') throw new Error("Purchase Order already received.");

    // 2. Process each item
    for (const item of po.purchase_order_items) {
      // Determine if it's a base product or variant
      const table = item.variant_id ? 'product_variants' : 'products';
      const id = item.variant_id || item.product_id;

      // Fetch current stock and cost
      const { data: currentProduct, error: prodError } = await supabase
        .from(table)
        .select('stock_quantity, average_cost_price')
        .eq('id', id)
        .single();

      if (prodError || !currentProduct) throw new Error(`Product not found for ID: ${id}`);

      const oldQty = currentProduct.stock_quantity || 0;
      const oldCost = currentProduct.average_cost_price || 0;
      const newQty = item.quantity;
      const newCost = item.unit_cost;
      const totalQty = oldQty + newQty;

      // Weighted Average Cost Formula: (oldQty * oldCost + newQty * newCost) / totalQty
      const newAverageCost = totalQty > 0 
        ? ((oldQty * oldCost) + (newQty * newCost)) / totalQty 
        : newCost;

      // Update Product/Variant
      const { error: updateError } = await supabase
        .from(table)
        .update({
          stock_quantity: totalQty,
          average_cost_price: newAverageCost
        })
        .eq('id', id);

      if (updateError) throw new Error(`Failed to update inventory for ${id}`);

      // Log to inventory_transactions (acting as ProductStockLedger)
      await supabase.from('inventory_transactions').insert({
        product_id: item.product_id,
        variant_id: item.variant_id,
        type: 'PURCHASE',
        quantity: newQty,
        before_stock: oldQty,
        after_stock: totalQty,
        reference_id: purchaseOrderId,
        reference_type: 'PURCHASE_ORDER',
        notes: `Received PO ${purchaseOrderId} at unit cost ${newCost}`
      });
    }

    // 3. Mark PO as RECEIVED
    await supabase
      .from('purchase_orders')
      .update({
        status: 'RECEIVED',
        received_date: new Date().toISOString()
      })
      .eq('id', purchaseOrderId);
  }
}
