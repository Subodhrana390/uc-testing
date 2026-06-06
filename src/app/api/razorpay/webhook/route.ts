import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { env } from "@/env";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature provided" }, { status: 400 });
    }

    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not defined");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventName = event.event;

    // Handle payment.captured, order.paid, payment.failed, and refund.processed events
    let razorpayOrderId = null;
    let razorpayPaymentId = null;
    let supabaseOrderId = null;
    let targetPaymentStatus = null; // "Paid", "Failed", "Refunded"
    let targetTransactionStatus = null; // "completed", "failed", "refunded"
    let refundAmount = null;

    if (eventName === "order.paid") {
      razorpayOrderId = event.payload.order.entity.id;
      razorpayPaymentId = event.payload.payment.entity.id;
      supabaseOrderId = event.payload.payment.entity.notes?.orderId || event.payload.order.entity.notes?.orderId;
      targetPaymentStatus = "Paid";
      targetTransactionStatus = "completed";
    } else if (eventName === "payment.captured") {
      razorpayOrderId = event.payload.payment.entity.order_id;
      razorpayPaymentId = event.payload.payment.entity.id;
      supabaseOrderId = event.payload.payment.entity.notes?.orderId;
      targetPaymentStatus = "Paid";
      targetTransactionStatus = "completed";
    } else if (eventName === "payment.failed") {
      razorpayOrderId = event.payload.payment.entity.order_id;
      razorpayPaymentId = event.payload.payment.entity.id;
      supabaseOrderId = event.payload.payment.entity.notes?.orderId;
      targetPaymentStatus = "Failed";
      targetTransactionStatus = "failed";
    } else if (eventName === "refund.processed") {
      razorpayPaymentId = event.payload.refund.entity.payment_id;
      targetPaymentStatus = "Refunded";
      targetTransactionStatus = "refunded";
      refundAmount = event.payload.refund.entity.amount / 100; // convert paise to INR
    }

    if (!razorpayOrderId && !supabaseOrderId && !razorpayPaymentId) {
      return NextResponse.json({ status: "ignored: no order identifiers found" });
    }

    const supabase = createServiceRoleClient();

    let query = supabase.from("orders").select("*");
    if (supabaseOrderId) {
      query = query.eq("id", supabaseOrderId);
    } else if (razorpayOrderId) {
      query = query.eq("razorpay_order_id", razorpayOrderId);
    } else if (razorpayPaymentId) {
      query = query.eq("razorpay_payment_id", razorpayPaymentId);
    } else {
      return NextResponse.json({ error: "No order identifiers found" }, { status: 400 });
    }

    const { data: order, error: fetchError } = await query.maybeSingle();

    if (fetchError || !order) {
      console.error("Webhook Order Fetch Error:", fetchError?.message || "Not found", "IDs:", { supabaseOrderId, razorpayOrderId, razorpayPaymentId });
      return NextResponse.json({ error: "Order not found in database" }, { status: 404 });
    }

    // Update order status/payment info
    const updatePayload: any = {
      payment_status: targetPaymentStatus,
      payment_method: "ONLINE"
    };

    if (razorpayOrderId) updatePayload.razorpay_order_id = razorpayOrderId;
    if (razorpayPaymentId) updatePayload.razorpay_payment_id = razorpayPaymentId;
    if (signature) updatePayload.razorpay_signature = signature;

    if (targetPaymentStatus === "Paid" && order.status === "Pending") {
      updatePayload.status = "Placed";
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Webhook Database Update Error:", updateError?.message || "Update failed");
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    if (targetPaymentStatus === "Paid" && order.status === "Pending") {
      try {
        const { sendOrderConfirmationEmail } = await import('@/lib/email')
        const { data: items } = await supabase
          .from("order_items")
          .select("*, products(name)")
          .eq("order_id", updatedOrder.id);

        await sendOrderConfirmationEmail({
          orderId: updatedOrder.id,
          orderDate: updatedOrder.created_at,
          customerName: updatedOrder.customer_name,
          customerEmail: updatedOrder.customer_email,
          shippingAddress: updatedOrder.shipping_address,
          totalAmount: updatedOrder.total_amount,
          items: items || [],
          trackingId: updatedOrder.tracking_id,
          carrier: updatedOrder.carrier
        });
      } catch (err) {
        console.error("Failed to send webhook order confirmation email:", err);
      }
    }

    // Insert payment record if not exists
    let targetTxId = razorpayPaymentId || `tx_${Math.random().toString(36).substring(2, 11)}`;
    if (eventName === "refund.processed") {
      targetTxId = event.payload.refund.entity.id; // use refund ID for refunds
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .eq("status", targetTransactionStatus)
      .eq("transaction_id", targetTxId)
      .maybeSingle();

    if (!existingPayment) {
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          amount: refundAmount !== null ? refundAmount : parseFloat(updatedOrder.total_amount),
          currency: "INR",
          status: targetTransactionStatus,
          payment_method: "ONLINE",
          transaction_id: targetTxId
        });

      if (paymentError) {
        console.error("Webhook Payment log insert error:", paymentError?.message || "Insert failed");
      }
    }

    console.log(`Webhook: Order ${order.id} verified and updated payment_status to ${targetPaymentStatus}`);
    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Razorpay Webhook Error:", error?.message || "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
