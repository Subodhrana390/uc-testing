// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import crypto from "node:crypto";

Deno.serve(async (req: Request) => {
  try {
    // 1. Signature verification
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const eventId = req.headers.get("x-razorpay-event-id");

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

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Idempotency check
    if (eventId) {
      const { data: processed } = await supabase.from('processed_webhooks').select('id').eq('event_id', eventId).maybeSingle();
      if (processed) {
        console.log(`Webhook ignored: Event ${eventId} already processed`);
        return new Response(JSON.stringify({ status: "ignored: already processed" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      // Log event
      await supabase.from('processed_webhooks').insert({ event_id: eventId, event_type: eventName });
    }

    // Handle events
    let razorpayOrderId = null;
    let razorpayPaymentId = null;
    let supabaseOrderId = null;
    let targetOrderStatus = null; // 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'REFUNDED'
    let refundAmount = null;

    if (eventName === "order.paid" || eventName === "payment.captured") {
      razorpayOrderId = event.payload?.order?.entity?.id || event.payload?.payment?.entity?.order_id;
      razorpayPaymentId = event.payload?.payment?.entity?.id;
      supabaseOrderId = event.payload?.payment?.entity?.notes?.orderId || event.payload?.order?.entity?.notes?.orderId;
      targetOrderStatus = "PAYMENT_SUCCESS";
    } else if (eventName === "payment.failed") {
      razorpayOrderId = event.payload?.payment?.entity?.order_id;
      razorpayPaymentId = event.payload?.payment?.entity?.id;
      supabaseOrderId = event.payload?.payment?.entity?.notes?.orderId;
      targetOrderStatus = "PAYMENT_FAILED";
    } else if (eventName === "refund.processed") {
      razorpayPaymentId = event.payload?.refund?.entity?.payment_id;
      targetOrderStatus = "REFUNDED";
      refundAmount = event.payload?.refund?.entity?.amount / 100; // paise to INR
    }

    if (!razorpayOrderId && !supabaseOrderId && !razorpayPaymentId) {
      return new Response(JSON.stringify({ status: "ignored: no order identifiers found" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    let query = supabase.from("orders").select("*");
    if (supabaseOrderId) query = query.eq("id", supabaseOrderId);
    else if (razorpayOrderId) query = query.eq("razorpay_order_id", razorpayOrderId);
    else if (razorpayPaymentId) query = query.eq("razorpay_payment_id", razorpayPaymentId);

    const { data: order, error: fetchError } = await query.maybeSingle();

    if (fetchError || !order) {
      console.error("Webhook Order Fetch Error:", fetchError);
      return new Response(JSON.stringify({ error: "Order not found in database" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Call transition_order_status to ensure DAG validation and side-effects
    // Only transition if order is not already in the target state
    if (order.status !== targetOrderStatus) {
        const { data: transitionResult, error: transitionError } = await supabase.rpc(
            'transition_order_status',
            {
                p_order_id: order.id,
                p_new_status: targetOrderStatus,
                p_actor_type: 'system',
                p_actor_id: null,
                p_remarks: `Razorpay webhook: ${eventName}`
            }
        );

        if (transitionError || !transitionResult?.success) {
            console.error("Webhook state transition failed:", transitionError || transitionResult);
            // Don't fail the webhook completely, maybe it was a duplicate state or invalid transition based on current state
        }
    }

    // Update razorpay specific tracking IDs
    await supabase.from("orders").update({
      razorpay_order_id: razorpayOrderId || order.razorpay_order_id,
      razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
      razorpay_signature: signature
    }).eq("id", order.id);

    // Track Payments
    let targetTxId = razorpayPaymentId || `tx_${Math.random().toString(36).substring(2, 11)}`;
    if (eventName === "refund.processed") targetTxId = event.payload.refund.entity.id;
    
    const targetTransactionStatus = targetOrderStatus === 'PAYMENT_SUCCESS' ? 'completed' : 
                                    targetOrderStatus === 'PAYMENT_FAILED' ? 'failed' : 
                                    targetOrderStatus === 'REFUNDED' ? 'refunded' : 'pending';

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .eq("status", targetTransactionStatus)
      .eq("transaction_id", targetTxId)
      .maybeSingle();

    if (!existingPayment) {
      await supabase.from("payments").insert({
          order_id: order.id,
          amount: refundAmount !== null ? refundAmount : parseFloat(order.total_amount),
          currency: "INR",
          status: targetTransactionStatus,
          payment_method: "ONLINE",
          transaction_id: targetTxId
        });
    }

    console.log(`Webhook: Order ${order.id} processed event ${eventName}`);
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
