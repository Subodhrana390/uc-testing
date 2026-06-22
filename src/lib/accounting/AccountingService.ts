import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { GSTLedgerEntry, AccountingEntry, OrderTaxBreakdown } from "@/types/accounting";

export class AccountingService {
  /**
   * Logs double-entry accounting records for a successful sale.
   */
  public static async recordSale(orderId: string, breakdown: OrderTaxBreakdown, invoiceNumber: string) {
    const supabase = createServiceRoleClient();

    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // 1. Create GST Ledger Entry
    const ledgerEntry = {
      order_id: orderId,
      invoice_number: invoiceNumber,
      taxable_value: breakdown.taxableAmount,
      cgst: breakdown.cgstAmount,
      sgst: breakdown.sgstAmount,
      igst: breakdown.igstAmount,
      shipping_tax: breakdown.shippingTaxAmount,
      total_tax_collected: breakdown.totalTaxAmount,
      month,
      year
    };

    const { error: ledgerError } = await supabase.from('gst_ledger').insert(ledgerEntry);
    if (ledgerError) throw new Error(`Failed to create GST Ledger entry: ${ledgerError.message}`);

    // 2. Create Double Entry Accounting Logs
    // Revenue = Taxable Amount
    // GST Payable = Total Tax Amount
    // Shipping Revenue = Shipping Cost (excluding GST on shipping, which goes to GST payable)

    const entries = [
      {
        order_id: orderId,
        entry_type: 'REVENUE',
        amount: breakdown.taxableAmount,
        description: `Product Revenue for Order ${orderId}`
      },
      {
        order_id: orderId,
        entry_type: 'GST_PAYABLE',
        amount: breakdown.totalTaxAmount,
        description: `GST Liability for Order ${orderId}`
      }
    ];

    if (breakdown.shippingCost > 0) {
      entries.push({
        order_id: orderId,
        entry_type: 'SHIPPING_REVENUE',
        amount: breakdown.shippingCost, // The actual cost charged to customer before tax
        description: `Shipping Revenue for Order ${orderId}`
      });
    }

    const { error: entriesError } = await supabase.from('accounting_entries').insert(entries);
    if (entriesError) throw new Error(`Failed to log accounting entries: ${entriesError.message}`);

    return { success: true };
  }
}
