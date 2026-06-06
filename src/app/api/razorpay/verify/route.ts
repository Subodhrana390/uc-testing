import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      return NextResponse.json({ status: "success" });
    } else {
      return NextResponse.json({ status: "failure" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Razorpay Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
