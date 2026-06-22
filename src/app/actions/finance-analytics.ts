"use server";

import { ProfitCalculationService } from "@/lib/accounting/ProfitCalculationService";
import { StockLedgerService, StockTransactionType } from "@/lib/accounting/StockLedgerService";
import { InventoryValuationService } from "@/lib/accounting/InventoryValuationService";
import { createClient } from "@/utils/supabase/server";
import { ProfitLossReport } from "@/types/finance";

export async function fetchProfitAndLossReport(month: number, year: number): Promise<{ success: boolean; data?: ProfitLossReport; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Auth check - ensure admin
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw new Error("Access Denied");

    const report = await ProfitCalculationService.generateProfitAndLossReport(month, year);
    return { success: true, data: report };
  } catch (err: any) {
    console.error("Error fetching P&L report:", err);
    return { success: false, error: err.message };
  }
}

export async function receivePurchaseOrderAction(purchaseOrderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw new Error("Access Denied");

    await InventoryValuationService.receivePurchaseOrder(purchaseOrderId);
    return { success: true };
  } catch (err: any) {
    console.error("Error receiving PO:", err);
    return { success: false, error: err.message };
  }
}

export async function logManualStockAdjustment(
  productId: string,
  variantId: string | null,
  type: StockTransactionType,
  quantityChange: number,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw new Error("Access Denied");

    await StockLedgerService.recordStockMovement(
      productId,
      variantId,
      type,
      quantityChange,
      undefined,
      'MANUAL_ADJUSTMENT',
      notes,
      user.id
    );
    return { success: true };
  } catch (err: any) {
    console.error("Error logging stock movement:", err);
    return { success: false, error: err.message };
  }
}
