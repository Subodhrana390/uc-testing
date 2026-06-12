"use server";

import { createClient } from "@/utils/supabase/server";
import { generateAndStoreInvoicePDF } from "./invoice-generator";

export async function getCustomerInvoices() {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        invoice_items (
          product_name,
          quantity,
          line_total
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching customer invoices:", error);
    return { success: false, error: error.message };
  }
}

export async function getInvoicePdfUrl(invoiceId: string) {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Fetch the invoice to verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("user_id, pdf_url")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) throw new Error("Invoice not found");
    if (invoice.user_id !== user.id) throw new Error("Unauthorized access to invoice");

    if (invoice.pdf_url) {
      return { success: true, pdfUrl: invoice.pdf_url };
    }

    // Generate and store on the fly
    const res = await generateAndStoreInvoicePDF(invoiceId);
    if (!res.success) {
      throw new Error(res.error || "Failed to generate PDF");
    }

    return { success: true, pdfUrl: res.pdfUrl };
  } catch (error: any) {
    console.error("Error getting invoice PDF URL:", error);
    return { success: false, error: error.message };
  }
}
