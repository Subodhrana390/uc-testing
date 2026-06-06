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

    // Handle payment.captured or order.paid events
    let razorpayOrderId = null;
    let razorpayPaymentId = null;
    let supabaseOrderId = null;

    if (eventName === "order.paid") {
      razorpayOrderId = event.payload.order.entity.id;
      razorpayPaymentId = event.payload.payment.entity.id;
      supabaseOrderId = event.payload.payment.entity.notes?.orderId || event.payload.order.entity.notes?.orderId;
    } else if (eventName === "payment.captured") {
      razorpayOrderId = event.payload.payment.entity.order_id;
      razorpayPaymentId = event.payload.payment.entity.id;
      supabaseOrderId = event.payload.payment.entity.notes?.orderId;
    }

    if (!razorpayOrderId && !supabaseOrderId) {
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
    }

    const { data: order, error: fetchError } = await query.maybeSingle();

    if (fetchError || !order) {
      console.error("Webhook Order Fetch Error:", fetchError, "IDs:", { supabaseOrderId, razorpayOrderId });
      return new Response(JSON.stringify({ error: "Order not found in database" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update order status/payment info
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "Paid",
        payment_method: "ONLINE",
        razorpay_order_id: razorpayOrderId || order.razorpay_order_id,
        razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
        razorpay_signature: signature,
        status: order.status === "Pending" ? "Placed" : order.status
      })
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
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .eq("status", "completed")
      .maybeSingle();

    if (!existingPayment) {
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          amount: parseFloat(updatedOrder.total_amount),
          currency: "INR",
          status: "completed",
          payment_method: "ONLINE",
          transaction_id: razorpayPaymentId || `tx_${Math.random().toString(36).substring(2, 11)}`
        });

      if (paymentError) {
        console.error("Webhook Payment log insert error:", paymentError);
      }
    }

    console.log(`Webhook: Order ${order.id} verified and marked as Paid`);
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
