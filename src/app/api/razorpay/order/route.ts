import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { amount, currency = "INR", idempotencyKey } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: idempotencyKey ? `rcpt_${idempotencyKey.slice(0, 10)}` : `receipt_${crypto.randomUUID().slice(0, 8)}`,
    };

    // Use idempotency key if provided to prevent duplicate orders
    // @ts-ignore - Razorpay types sometimes lag behind the actual SDK capability for headers
    const order = await razorpay.orders.create(options, idempotencyKey ? {
      "X-Razorpay-Idempotency-Key": idempotencyKey
    } : undefined);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
