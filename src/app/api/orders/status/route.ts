import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient as createAdminServerClient } from "@/utils/supabase/admin-server";
import { generateInvoicePDF } from "@/lib/invoice";
import { sendInvoiceEmail, sendStatusUpdateEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { env } from "@/env";

export async function POST(req: Request) {
  try {
    const {
      orderId,
      status,
      trackingId,
      carrier,
      paymentStatus,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      remarks,
    } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const { cookies } = await import("next/headers");
    const cookieStore = cookies();
    const hasAdminCookie = cookieStore.has("sb-admin-auth-token");

    let supabase = await createClient();
    let user = null;

    if (hasAdminCookie) {
      const adminSupabase = await createAdminServerClient();
      const { data: { user: adminUser }, error: adminAuthError } = await adminSupabase.auth.getUser();
      if (!adminAuthError && adminUser) {
        user = adminUser;
        supabase = adminSupabase;
      }
    }

    if (!user) {
      const { data: { user: customerUser } } = await supabase.auth.getUser();
      user = customerUser;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine actor role from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const actor = profile?.role || "customer";

    const isAdmin = actor === "admin";
    const serviceRoleSupabase = createServiceRoleClient();

    // Fetch the order using Service Role Client to bypass potential SELECT RLS issues
    const { data: existingOrder, error: fetchOrderError } = await serviceRoleSupabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchOrderError || !existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Enforce authorization: only admins can view other users' orders. Customers can only view their own.
    if (!isAdmin && existingOrder.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 1. If order status is being updated, enforce State Machine transition
    if (status !== undefined && status.toUpperCase() !== existingOrder.status.toUpperCase()) {
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
      if (!isAdmin) {
        // If customer is updating, only allow verifying and setting online payments
        if (paymentStatus === "Paid" && paymentMethod === "ONLINE") {
          if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return NextResponse.json({ error: "Missing Razorpay details for verification" }, { status: 400 });
          }

          // Cryptographically verify Razorpay signature
          const body = razorpayOrderId + "|" + razorpayPaymentId;
          const expectedSignature = crypto
            .createHmac("sha256", env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest("hex");

          if (expectedSignature !== razorpaySignature) {
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
          }

          updateData.razorpay_order_id = razorpayOrderId;
        } else {
          return NextResponse.json({ error: "Unauthorized metadata update" }, { status: 403 });
        }
      }

      // Perform update via Service Role Client to bypass customer UPDATE RLS restriction
      const { data: updatedOrder, error: updateError } = await serviceRoleSupabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateError) throw updateError;
      order = updatedOrder;

      if (paymentStatus === "Refunded") {
        await serviceRoleSupabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("order_id", orderId);
      }

      // If customer successfully paid online, transition order status to CONFIRMED
      if (!isAdmin && paymentStatus === "Paid" && paymentMethod === "ONLINE" &&
          ["PENDING", "PLACED"].includes(existingOrder.status.toUpperCase())) {
        
        // Transition to ORDER_CONFIRMED directly (works for both PENDING_PAYMENT and PENDING initial states)
        const targetConfirmedStatus = existingOrder.status.toUpperCase() === "PENDING_PAYMENT"
          ? "ORDER_CONFIRMED"
          : "CONFIRMED";

        const { data: confirmedResult, error: confirmedError } = await serviceRoleSupabase.rpc(
          "transition_order_status",
          {
            p_order_id: orderId,
            p_new_status: targetConfirmedStatus,
            p_actor_type: "system",
            p_actor_id: user.id,
            p_remarks: "Paid online via Razorpay (verified)"
          }
        );

        // If ORDER_CONFIRMED failed, try CONFIRMED as fallback
        if (confirmedError || !(confirmedResult as any)?.success) {
          console.warn(`Transition to ${targetConfirmedStatus} failed, trying CONFIRMED:`, confirmedError?.message || (confirmedResult as any)?.error);
          const { error: fallbackError } = await serviceRoleSupabase.rpc(
            "transition_order_status",
            {
              p_order_id: orderId,
              p_new_status: "CONFIRMED",
              p_actor_type: "system",
              p_actor_id: user.id,
              p_remarks: "Paid online via Razorpay (verified) - fallback"
            }
          );
          if (fallbackError) {
            console.error("Fallback transition to CONFIRMED also failed:", fallbackError.message);
          }
        }

        // Refresh order status
        const { data: refreshedOrder } = await serviceRoleSupabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();
        if (refreshedOrder) {
          order = refreshedOrder;
        }

        if (existingOrder.status.toUpperCase() === "PENDING") {
          await serviceRoleSupabase.from('email_queue').insert({
            type: 'ORDER_CONFIRMATION',
            payload: { orderId: orderId }
          });
        }
      }
    } else {
      // No updates, just fetch current order (using service role to ensure consistency)
      const { data: currentOrder } = await serviceRoleSupabase
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
          payment_method: order.payment_method || "ONLINE",
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
      await serviceRoleSupabase.from('email_queue').insert({
        type: 'STATUS_UPDATE',
        payload: {
          orderId: order.id,
          status: status.toUpperCase(),
          remarks: remarks || null
        }
      });
    }

    // 5. If status is "Delivered", generate and send invoice
    if (status === "DELIVERED" || status === "Delivered") {
      await serviceRoleSupabase.from('email_queue').insert({
        type: 'INVOICE',
        payload: { orderId: order.id }
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Order Status Update Error:", error?.message || "Unknown error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
