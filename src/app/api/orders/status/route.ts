import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateInvoicePDF } from "@/lib/invoice";
import { sendInvoiceEmail, sendStatusUpdateEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function POST(req: Request) {
  try {
    const { orderId, status, trackingId, carrier, paymentStatus, paymentMethod, razorpayPaymentId, razorpaySignature, remarks } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const supabase = await createClient();

    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine actor role from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const actor = profile?.role || "customer";

    // 1. If order status is being updated, enforce State Machine transition
    if (status !== undefined) {
      const { data: transitionResult, error: rpcError } = await supabase.rpc(
        "transition_order_status",
        {
          p_order_id: orderId,
          p_new_status: status.toUpperCase(),
          p_actor_type: actor,
          p_actor_id: user.id,
          p_remarks: remarks || `Updated by ${actor}`
        }
      );

      if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 500 });
      }

      const resData = transitionResult as any;
      if (!resData.success) {
        return NextResponse.json({ error: resData.error || "Invalid status transition" }, { status: 400 });
      }
    }

    // 2. Handle metadata updates (tracking ID, carrier, paymentStatus, paymentMethod, etc.)
    const updateData: any = {};
    if (trackingId !== undefined) updateData.tracking_id = trackingId;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
    if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;
    if (razorpayPaymentId !== undefined) updateData.razorpay_payment_id = razorpayPaymentId;
    if (razorpaySignature !== undefined) updateData.razorpay_signature = razorpaySignature;

    let order = null;
    if (Object.keys(updateData).length > 0) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateError) throw updateError;
      order = updatedOrder;
    } else {
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      order = currentOrder;
    }

    // 3. Insert/update payment record if paid using Service Role to bypass RLS
    if (order && order.payment_status === "Paid") {
      const serviceRoleSupabase = createServiceRoleClient();
      
      const { data: updatedPayment, error: paymentUpdateError } = await serviceRoleSupabase
        .from("payments")
        .update({
          status: "completed",
          transaction_id: razorpayPaymentId || order.razorpay_payment_id || `tx_${Math.random().toString(36).substring(2, 11)}`
        })
        .eq("order_id", orderId)
        .eq("status", "pending")
        .select();

      if (paymentUpdateError || !updatedPayment || updatedPayment.length === 0) {
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
            console.error("Failed to insert fallback payment record:", paymentError);
          }
        }
      }
    }

    // 4. Trigger Email Notification for Status Change
    if (status !== undefined && order) {
      try {
        await sendStatusUpdateEmail(
          order.customer_email,
          order.customer_name,
          order.id,
          status.toUpperCase(),
          remarks
        );
      } catch (emailErr) {
        console.error("Failed to send status update email:", emailErr);
      }
    }

    // 5. If status is "Delivered", generate and send invoice
    if (status === "DELIVERED" || status === "Delivered") {
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*, products(name, image_url)")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

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

      const doc = await generateInvoicePDF(invoiceData);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

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
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Order Status Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
