"use server";

import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { generateAndStoreInvoicePDF } from "./invoice-generator";

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
    
    const { error } = await supabase.rpc('enqueue_job', {
      queue_name: 'email_queue',
      job_message: {
        type: 'INVOICE',
        payload: { orderId }
      }
    });

    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error("Error resending invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function getOrCreateInvoiceForOrder(orderId: string) {
  try {
    const supabase = createServiceRoleClient();

    // 1. Check if invoice already exists
    const { data: existingInvoice, error: findError } = await supabase
      .from("invoices")
      .select("id, pdf_url")
      .eq("order_id", orderId)
      .maybeSingle();

    if (findError) throw findError;

    if (existingInvoice) {
      if (existingInvoice.pdf_url) {
        return { success: true, pdfUrl: existingInvoice.pdf_url };
      }
      // Generate and store on the fly
      const res = await generateAndStoreInvoicePDF(existingInvoice.id);
      if (!res.success) {
        throw new Error(res.error || "Failed to generate PDF");
      }
      return { success: true, pdfUrl: res.pdfUrl };
    }

    // 2. If it does not exist, fetch order details with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            hsn_code,
            tax_rate,
            is_tax_inclusive
          ),
          product_variants (
            id,
            name,
            sku
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Order not found");
    }

    // 3. Generate a new invoice number
    const { data: invoiceNum, error: seqError } = await supabase
      .rpc("generate_invoice_number");

    if (seqError) {
      throw new Error(seqError.message || "Failed to generate invoice number");
    }

    // Determine status
    let invoiceStatus = "PENDING_PAYMENT";
    const statusUpper = (order.status || "").toUpperCase();
    const paymentStatusLower = (order.payment_status || "").toLowerCase();

    if (paymentStatusLower === "paid" || statusUpper === "PAYMENT_SUCCESS") {
      invoiceStatus = "PAID";
    } else if (statusUpper === "CANCELLED") {
      invoiceStatus = "CANCELLED";
    } else if (statusUpper === "REFUNDED") {
      invoiceStatus = "REFUNDED";
    }

    // Compute financial breakdowns
    const subtotal = order.order_items?.reduce((sum: number, item: any) => sum + (parseFloat(item.unit_price) * item.quantity), 0) || 0;
    const discount_amount = parseFloat(order.discount_amount || 0);
    const shipping_amount = parseFloat(order.shipping_amount || 0);
    const tax_amount = parseFloat(order.tax_amount || 0);
    const total_amount = parseFloat(order.total_amount || 0);

    // 4. Insert Invoice
    const { data: newInvoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNum,
        order_id: orderId,
        user_id: order.user_id,
        status: invoiceStatus,
        subtotal,
        discount_amount,
        tax_amount,
        shipping_amount,
        total_amount,
        currency: order.currency || "INR",
        issued_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (insertError || !newInvoice) {
      throw new Error(insertError?.message || "Failed to create invoice");
    }

    // 5. Insert Invoice Items
    const invoiceItemsData = order.order_items.map((item: any) => {
      const prodName = item.product_variants?.name || item.products?.name || "Unknown Product";
      const sku = item.product_variants?.sku || item.products?.id || "";
      const hsn = item.products?.hsn_code || "";
      const lineTotal = parseFloat(item.unit_price) * item.quantity;
      return {
        invoice_id: newInvoice.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: prodName,
        sku,
        hsn_code: hsn,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        line_total: lineTotal
      };
    });

    const { error: itemsInsertError } = await supabase
      .from("invoice_items")
      .insert(invoiceItemsData);

    if (itemsInsertError) {
      throw new Error(itemsInsertError.message || "Failed to save invoice items");
    }

    // 6. Generate and store PDF
    const res = await generateAndStoreInvoicePDF(newInvoice.id);
    if (!res.success) {
      throw new Error(res.error || "Failed to generate PDF");
    }

    return { success: true, pdfUrl: res.pdfUrl };
  } catch (error: any) {
    console.error("Error in getOrCreateInvoiceForOrder:", error);
    return { success: false, error: error.message };
  }
}
