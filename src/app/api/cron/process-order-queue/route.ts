import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function GET(req: Request) {
  try {
    const supabase = createServiceRoleClient();

    // 1. Claim up to 10 pending jobs
    const { data: jobs, error: claimError } = await supabase.rpc('claim_order_jobs', { batch_size: 10 });
    
    if (claimError) {
      console.error("Failed to claim order jobs:", claimError);
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processedCount = 0;

    for (const job of jobs) {
      try {
        const { event, signature } = job.payload;
        if (!event) throw new Error("Missing event in job payload");

        const eventName = event.event;

        let razorpayOrderId = null;
        let razorpayPaymentId = null;
        let supabaseOrderId = null;
        let targetPaymentStatus = null;
        let targetTransactionStatus = null;
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
          refundAmount = event.payload.refund.entity.amount / 100;
        }

        if (!razorpayOrderId && !supabaseOrderId && !razorpayPaymentId) {
          throw new Error("Ignored: no order identifiers found");
        }

        let query = supabase.from("orders").select("*");
        if (supabaseOrderId) {
          query = query.eq("id", supabaseOrderId);
        } else if (razorpayOrderId) {
          query = query.eq("razorpay_order_id", razorpayOrderId);
        } else if (razorpayPaymentId) {
          query = query.eq("razorpay_payment_id", razorpayPaymentId);
        } else {
          throw new Error("No order identifiers found");
        }

        const { data: order, error: fetchError } = await query.maybeSingle();

        if (fetchError || !order) {
          throw new Error(`Order not found in database: IDs ${supabaseOrderId}, ${razorpayOrderId}`);
        }

        // Update order status/payment info
        const updatePayload: any = {
          payment_status: targetPaymentStatus,
          payment_method: "ONLINE"
        };

        if (razorpayOrderId) updatePayload.razorpay_order_id = razorpayOrderId;
        if (razorpayPaymentId) updatePayload.razorpay_payment_id = razorpayPaymentId;
        if (signature) updatePayload.razorpay_signature = signature;

        const statusUpper = order.status ? order.status.toUpperCase() : "";
        let shouldTransition = false;
        let transitionTo = "";

        if (targetPaymentStatus === "Paid" && (statusUpper === "PENDING" || statusUpper === "PENDING_PAYMENT")) {
          shouldTransition = true;
          transitionTo = "PLACED";
        } else if (targetPaymentStatus === "Failed") {
          shouldTransition = true;
          transitionTo = "FAILED";
        }

        const { data: updatedOrder, error: updateError } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", order.id)
          .select("*")
          .single();

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        if (shouldTransition) {
          const { data: transitionResult, error: rpcError } = await supabase.rpc(
            "transition_order_status",
            {
              p_order_id: order.id,
              p_new_status: transitionTo,
              p_actor_type: "system",
              p_actor_id: order.user_id,
              p_remarks: `Payment processed: ${targetPaymentStatus}`
            }
          );

          if (rpcError) {
            console.error(`Status transition to ${transitionTo} failed via RPC:`, rpcError.message);
          } else {
            const resData = transitionResult as any;
            if (!resData.success) {
              console.error(`Status transition to ${transitionTo} failed:`, resData.error);
            }
          }
        }

        // Send email if confirmed
        if (targetPaymentStatus === "Paid" && (statusUpper === "PENDING" || statusUpper === "PENDING_PAYMENT")) {
          // Instead of sending synchronously, just push to email_queue
          await supabase.from('email_queue').insert({
            type: 'ORDER_CONFIRMATION',
            payload: { orderId: updatedOrder.id }
          });
        }

        // Insert payment record if not exists
        let targetTxId = razorpayPaymentId || `tx_${Math.random().toString(36).substring(2, 11)}`;
        if (eventName === "refund.processed") {
          targetTxId = event.payload.refund.entity.id;
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
            console.error("Queue Payment log insert error:", paymentError.message);
          }
        }

        // Mark as COMPLETED
        await supabase.from('order_processing_queue').update({
          status: 'COMPLETED',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);

        processedCount++;
      } catch (err: any) {
        console.error(`Order Job ${job.id} failed:`, err);
        // Mark as FAILED
        await supabase.from('order_processing_queue').update({
          status: 'FAILED',
          error: err.message || "Unknown error",
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (err: any) {
    console.error("Error processing order queue:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = GET;
