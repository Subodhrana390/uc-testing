"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShoppingBag, ArrowRight, Calendar, Package } from "lucide-react";
import { getDisplayOrderId } from "@/lib/order";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const total = searchParams.get("total") || "";
  const date = searchParams.get("date") || "";

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-zinc-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white border border-zinc-150 p-8 md:p-10 rounded-3xl shadow-xl text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Check Circle */}
        <div className="flex justify-center relative">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Order Placed Successfully!</h1>
          <p className="text-sm text-zinc-500 font-medium">
            Thank you for your purchase. Your order has been registered and is now being processed.
          </p>
        </div>

        {/* Details Box */}
        {(orderId || total || date) && (
          <div className="bg-zinc-50/80 border border-zinc-100 rounded-2xl p-5 text-left space-y-3">
            {orderId && (
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wider">Order ID</span>
                <span className="font-mono font-bold text-zinc-800 bg-zinc-200/60 px-2.5 py-1 rounded-md">
                  {getDisplayOrderId(orderId, new Date().toISOString())}
                </span>
              </div>
            )}
            
            {total && (
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wider">Amount Paid</span>
                <span className="font-extrabold text-zinc-900 text-sm">
                  ₹{parseFloat(total).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {date && (
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Estimated Delivery
                </span>
                <span className="font-extrabold text-emerald-650">
                  {date}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <Link href="/account/orders" className="w-full">
            <button className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md">
              <Package className="w-4 h-4" />
              View My Orders
            </button>
          </Link>
          
          <Link href="/" className="w-full">
            <button className="w-full h-12 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
              <ShoppingBag className="w-4 h-4" />
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
