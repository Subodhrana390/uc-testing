"use server";

import { createClient } from "@/utils/supabase/server";

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
