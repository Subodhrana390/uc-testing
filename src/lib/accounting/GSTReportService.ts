import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { GSTReportResult } from "@/types/accounting";

export class GSTReportService {
  /**
   * Generates GST metrics for a given month and year.
   */
  public static async getMonthlyReport(month: number, year: number): Promise<GSTReportResult> {
    const supabase = createServiceRoleClient();

    const { data: ledger, error } = await supabase
      .from('gst_ledger')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (error) throw new Error(`Error fetching GST ledger: ${error.message}`);

    let taxableSales = 0;
    let cgstCollected = 0;
    let sgstCollected = 0;
    let igstCollected = 0;
    let shippingGST = 0;
    let totalGSTLiability = 0;

    for (const entry of ledger) {
      taxableSales += Number(entry.taxable_value);
      cgstCollected += Number(entry.cgst);
      sgstCollected += Number(entry.sgst);
      igstCollected += Number(entry.igst);
      shippingGST += Number(entry.shipping_tax);
      totalGSTLiability += Number(entry.total_tax_collected);
    }

    const netRevenue = taxableSales; // Simplified net revenue is just the taxable base (excludes GST liability)

    return {
      taxableSales,
      cgstCollected,
      sgstCollected,
      igstCollected,
      shippingGST,
      totalGSTLiability,
      netRevenue
    };
  }

  /**
   * Generates GST metrics for the entire year.
   */
  public static async getYearlyReport(year: number): Promise<GSTReportResult> {
    const supabase = createServiceRoleClient();

    const { data: ledger, error } = await supabase
      .from('gst_ledger')
      .select('*')
      .eq('year', year);

    if (error) throw new Error(`Error fetching GST ledger: ${error.message}`);

    let taxableSales = 0;
    let cgstCollected = 0;
    let sgstCollected = 0;
    let igstCollected = 0;
    let shippingGST = 0;
    let totalGSTLiability = 0;

    for (const entry of ledger) {
      taxableSales += Number(entry.taxable_value);
      cgstCollected += Number(entry.cgst);
      sgstCollected += Number(entry.sgst);
      igstCollected += Number(entry.igst);
      shippingGST += Number(entry.shipping_tax);
      totalGSTLiability += Number(entry.total_tax_collected);
    }

    return {
      taxableSales,
      cgstCollected,
      sgstCollected,
      igstCollected,
      shippingGST,
      totalGSTLiability,
      netRevenue: taxableSales
    };
  }
}
