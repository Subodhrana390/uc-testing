import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature provided" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
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
    const supabase = await createClient();

    // Handle payment.captured or order.paid events
    if (event.event === "order.paid") {
      const razorpayOrderId = event.payload.order.entity.id;
      const razorpayPaymentId = event.payload.payment.entity.id;

      // Update order status in Supabase
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: "Paid",
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: signature, // Webhook signature is different but acts as proof
        })
        .eq("razorpay_order_id", razorpayOrderId)
        .neq("status", "Paid") // Only update if not already paid
        .select();

      if (error) {
        console.error("Webhook Database Error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      console.log(`Webhook: Order ${razorpayOrderId} marked as Paid`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Razorpay Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
