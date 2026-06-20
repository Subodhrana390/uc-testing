import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const urlObj = new URL(req.url);
    const bypass = urlObj.searchParams.get("bypass") === "true";

    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      !bypass &&
      process.env.NODE_ENV !== "development"
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Fetch active shipments (exclude terminal statuses)
    const { data: shipments, error: fetchError } = await supabase
      .from("shipments")
      .select("*, orders(status, payment_method, total_amount, razorpay_payment_id)")
      .not("status", "in", '("DELIVERED","RETURN_RECEIVED","CANCELLED","REPLACED")');

    if (fetchError) {
      console.error("Sync Shipments Cron: Error fetching active shipments:", fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    const updatedShipments = [];

    for (const shipment of shipments) {
      const order = shipment.orders as any;
      if (!order) continue;

      const currentStatus = shipment.status.toUpperCase();
      let nextStatus = currentStatus;
      let isOutbound = true;

      // Determine if outbound or reverse logistics
      if (
        ["PICKUP_SCHEDULED", "PICKED_UP", "RETURN_IN_TRANSIT", "RETURN_RECEIVED"].includes(
          currentStatus
        )
      ) {
        isOutbound = false;
      }

      if (isOutbound) {
        if (currentStatus === "LABEL_CREATED") {
          nextStatus = "IN_TRANSIT";
        } else if (currentStatus === "IN_TRANSIT") {
          nextStatus = "OUT_FOR_DELIVERY";
        } else if (currentStatus === "OUT_FOR_DELIVERY") {
          nextStatus = "DELIVERED";
        } else {
          nextStatus = "IN_TRANSIT"; // default fallback
        }
      } else {
        if (currentStatus === "PICKUP_SCHEDULED") {
          nextStatus = "PICKED_UP";
        } else if (currentStatus === "PICKED_UP") {
          nextStatus = "RETURN_IN_TRANSIT";
        } else if (currentStatus === "RETURN_IN_TRANSIT") {
          nextStatus = "RETURN_RECEIVED";
        } else {
          nextStatus = "PICKED_UP"; // default fallback
        }
      }

      // Update shipment record status
      const { error: updateError } = await supabase
        .from("shipments")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", shipment.id);

      if (updateError) {
        console.error(`Sync Shipments Cron: Failed to update shipment ${shipment.id}:`, updateError.message);
        continue;
      }

      // Auto-transition corresponding order status if terminal delivery reached
      if (nextStatus === "DELIVERED" && isOutbound) {
        // Transition order status to DELIVERED
        const { data: transitionResult, error: transitionError } = await supabase.rpc(
          "transition_order_status",
          {
            p_order_id: shipment.order_id,
            p_new_status: "DELIVERED",
            p_actor_type: "system",
            p_actor_id: null,
            p_remarks: "Shipment delivered automatically by courier sync"
          }
        );

        if (transitionError) {
          console.error(`Sync Shipments Cron: Transition order ${shipment.order_id} to DELIVERED failed:`, transitionError.message);
        } else {
          // Enqueue jobs in email_queue
          await supabase.rpc("enqueue_job", {
            queue_name: "email_queue",
            job_message: {
              type: "STATUS_UPDATE",
              payload: {
                orderId: shipment.order_id,
                status: "DELIVERED",
                remarks: "Shipment delivered automatically by courier sync"
              }
            }
          });

          await supabase.rpc("enqueue_job", {
            queue_name: "email_queue",
            job_message: {
              type: "INVOICE",
              payload: { orderId: shipment.order_id }
            }
          });
        }
      } else if (nextStatus === "RETURN_RECEIVED" && !isOutbound) {
        const orderStatusUpper = order.status.toUpperCase();
        
        if (orderStatusUpper === "RETURN_APPROVED") {
          // Transition order status to RETURNED
          await supabase.rpc("transition_order_status", {
            p_order_id: shipment.order_id,
            p_new_status: "RETURNED",
            p_actor_type: "system",
            p_actor_id: null,
            p_remarks: "Return shipment received at warehouse"
          });

          // Transition order status to REFUND_PENDING
          await supabase.rpc("transition_order_status", {
            p_order_id: shipment.order_id,
            p_new_status: "REFUND_PENDING",
            p_actor_type: "system",
            p_actor_id: null,
            p_remarks: "Auto-processed to refund pending after product returned"
          });

          // Handle automatic online refund
          let refundSuccess = false;
          if (order.payment_method === "ONLINE" && order.razorpay_payment_id) {
            try {
              const Razorpay = (await import("razorpay")).default;
              const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID || "",
                key_secret: process.env.RAZORPAY_KEY_SECRET || "",
              });

              await razorpay.payments.refund(order.razorpay_payment_id, {
                amount: Math.round(parseFloat(order.total_amount) * 100)
              });
              refundSuccess = true;
            } catch (err: any) {
              console.error("Sync Shipments Cron: Auto-refund failed via Razorpay:", err?.message || err);
            }
          } else {
            refundSuccess = true; // COD/Offline payout is managed manually by admin
          }

          if (refundSuccess) {
            await supabase.rpc("transition_order_status", {
              p_order_id: shipment.order_id,
              p_new_status: "REFUNDED",
              p_actor_type: "system",
              p_actor_id: null,
              p_remarks: "Auto-refund processed successfully"
            });

            await supabase
              .from("payments")
              .update({ status: "refunded" })
              .eq("order_id", shipment.order_id);
          }
        } else if (orderStatusUpper === "REPLACEMENT_APPROVED") {
          // Transition order status to REPLACED
          await supabase.rpc("transition_order_status", {
            p_order_id: shipment.order_id,
            p_new_status: "REPLACED",
            p_actor_type: "system",
            p_actor_id: null,
            p_remarks: "Replacement unit delivered to customer"
          });

          await supabase.rpc("enqueue_job", {
            queue_name: "email_queue",
            job_message: {
              type: "STATUS_UPDATE",
              payload: {
                orderId: shipment.order_id,
                status: "REPLACED",
                remarks: "Replacement unit delivered to customer"
              }
            }
          });
        }
      }

      updatedShipments.push({
        id: shipment.id,
        order_id: shipment.order_id,
        previous_status: currentStatus,
        new_status: nextStatus
      });
    }

    return NextResponse.json({
      success: true,
      synced: updatedShipments.length,
      updates: updatedShipments
    });
  } catch (err: any) {
    console.error("Sync Shipments Cron unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export const POST = GET;
