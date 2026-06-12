"use server";

import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function getAdminInvoices() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        orders (customer_name, customer_email)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching admin invoices:", error);
    return { success: false, error: error.message };
  }
}

export async function getInvoiceStats() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from("invoices")
      .select("status, total_amount");

    if (error) throw error;

    let totalRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;

    data.forEach(inv => {
      if (inv.status === 'PAID') {
        totalRevenue += parseFloat(inv.total_amount);
        paidCount++;
      } else if (inv.status === 'PENDING_PAYMENT' || inv.status === 'DRAFT') {
        pendingCount++;
      } else if (inv.status === 'REFUNDED') {
        refundedCount++;
      }
    });

    return {
      success: true,
      data: {
        totalInvoices: data.length,
        totalRevenue,
        paidCount,
        pendingCount,
        refundedCount
      }
    };
  } catch (error: any) {
    console.error("Error fetching invoice stats:", error);
    return { success: false, error: error.message };
  }
}

export async function resendInvoiceEmail(orderId: string) {
  try {
    const supabase = createServiceRoleClient();
    
    const { error } = await supabase.from('email_queue').insert({
      type: 'INVOICE',
      payload: { orderId }
    });

    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error("Error resending invoice:", error);
    return { success: false, error: error.message };
  }
}
