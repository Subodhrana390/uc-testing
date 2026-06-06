// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import crypto from "node:crypto";

Deno.serve(async (req: Request) => {
  try {
    // 1. Signature verification
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not defined in Supabase Edge Function environment");
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
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
      return new Response(JSON.stringify({ status: "ignored: no order identifiers found" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase Client using local env variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    let query = supabase.from("orders").select("*");
    if (supabaseOrderId) {
      query = query.eq("id", supabaseOrderId);
    } else if (razorpayOrderId) {
      query = query.eq("razorpay_order_id", razorpayOrderId);
    } else if (razorpayPaymentId) {
      query = query.eq("razorpay_payment_id", razorpayPaymentId);
    }

    const { data: order, error: fetchError } = await query.maybeSingle();

    if (fetchError || !order) {
      console.error("Webhook Order Fetch Error:", fetchError, "IDs:", { supabaseOrderId, razorpayOrderId, razorpayPaymentId });
      return new Response(JSON.stringify({ error: "Order not found in database" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
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
      console.error("Webhook Database Update Error:", updateError);
      return new Response(JSON.stringify({ error: "Database update failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
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
        console.error("Webhook Payment log insert error:", paymentError);
      }
    }

    console.log(`Webhook: Order ${order.id} verified and updated payment_status to ${targetPaymentStatus}`);
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Razorpay Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
