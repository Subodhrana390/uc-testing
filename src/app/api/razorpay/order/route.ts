import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/utils/supabase/server";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, currency = "INR", idempotencyKey } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: idempotencyKey ? `rcpt_${idempotencyKey.slice(0, 10)}` : `receipt_${crypto.randomUUID().slice(0, 8)}`,
      notes: {
        orderId: idempotencyKey
      }
    };

    const order = await razorpay.orders.create(options);

    // Save the Razorpay Order ID to the database early so webhooks don't 404
    if (idempotencyKey) {
      await supabase
        .from("orders")
        .update({ razorpay_order_id: order.id })
        .eq("id", idempotencyKey);
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
