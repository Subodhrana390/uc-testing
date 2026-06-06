import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateInvoicePDF } from "@/lib/invoice";
import { sendInvoiceEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function POST(req: Request) {
  try {
    const { orderId, status, trackingId, carrier, paymentStatus, paymentMethod, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const supabase = await createClient();

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (trackingId !== undefined) updateData.tracking_id = trackingId;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
    if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;
    if (razorpayPaymentId !== undefined) updateData.razorpay_payment_id = razorpayPaymentId;
    if (razorpaySignature !== undefined) updateData.razorpay_signature = razorpaySignature;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // 1. Update status in DB
    const { data: order, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    // Insert payment record if paid using Service Role to bypass RLS
    if (order && order.payment_status === "Paid") {
      const serviceRoleSupabase = createServiceRoleClient();
      const { data: existingPayment } = await serviceRoleSupabase
        .from("payments")
        .select("id")
        .eq("order_id", orderId)
        .eq("status", "completed")
        .maybeSingle();

      if (!existingPayment) {
        const { error: paymentError } = await serviceRoleSupabase
          .from("payments")
          .insert({
            order_id: orderId,
            amount: parseFloat(order.total_amount),
            currency: "INR",
            status: "completed",
            payment_method: order.payment_method || "ONLINE",
            transaction_id: razorpayPaymentId || order.razorpay_payment_id || `tx_${Math.random().toString(36).substring(2, 11)}`
          });
        if (paymentError) {
          console.error("Failed to insert payment record:", paymentError);
        }
      }
    }

    // 2. If status is "Delivered", generate and send invoice
    if (status === "Delivered") {
      // Fetch order items with product details
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*, products(name, image_url)")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      // Prepare invoice data
      const invoiceData = {
        orderId: order.id,
        date: order.created_at,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.phone,
        address: order.shipping_address || "N/A",
        items: items || [],
        totalAmount: parseFloat(order.total_amount)
      };

      // Generate PDF
      const doc = await generateInvoicePDF(invoiceData);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // Send Email via Brevo
      try {
        await sendInvoiceEmail(
          order.customer_email,
          order.customer_name,
          order.id,
          pdfBase64
        );
        console.log(`Invoice sent to ${order.customer_email} for order ${orderId}`);
      } catch (emailError) {
        console.error("Failed to send invoice email:", emailError);
        // We don't fail the whole request if only email fails, but we should log it
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Order Status Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
