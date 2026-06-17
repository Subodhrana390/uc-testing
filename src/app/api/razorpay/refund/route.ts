import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient as createAdminServerClient } from "@/utils/supabase/admin-server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const { cookies } = await import("next/headers");
    const cookieStore = cookies();
    const hasAdminCookie = cookieStore.has("sb-admin-auth-token");

    let isAdmin = false;
    let adminUserId = null;
    if (hasAdminCookie) {
      const adminSupabase = await createAdminServerClient();
      const { data: { user: adminUser }, error: adminAuthError } = await adminSupabase.auth.getUser();
      if (!adminAuthError && adminUser) {
        isAdmin = true;
        adminUserId = adminUser.id;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Only admins can process refunds." }, { status: 401 });
    }

    const serviceRoleSupabase = createServiceRoleClient();

    // Get order details
    const { data: order, error } = await serviceRoleSupabase
      .from("orders")
      .select("razorpay_payment_id, total_amount, payment_status")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.razorpay_payment_id) {
      return NextResponse.json({ error: "No Razorpay payment associated with this order. Cannot process online refund." }, { status: 400 });
    }

    if (order.payment_status === "Refunded") {
      return NextResponse.json({ error: "Order is already refunded" }, { status: 400 });
    }

    // Initiate refund on Razorpay
    const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
      amount: Math.round(parseFloat(order.total_amount) * 100) // refund full amount in paise
    });

    // Update order status using the state machine
    const { error: rpcError } = await serviceRoleSupabase.rpc('transition_order_status', {
      p_order_id: orderId,
      p_new_status: 'REFUNDED',
      p_actor_type: 'admin',
      p_actor_id: adminUserId,
      p_remarks: `Refunded via Razorpay. Refund ID: ${refund.id}`
    });

    if (rpcError) {
      console.error("Error updating order status:", rpcError);
      return NextResponse.json({ error: "Refund succeeded but failed to update order status." }, { status: 500 });
    }

    // Store the refund ID in the orders table
    await serviceRoleSupabase.from("orders").update({ razorpay_refund_id: refund.id }).eq("id", orderId);

    return NextResponse.json({ success: true, refund });
  } catch (error: any) {
    console.error("Razorpay Refund Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
