"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw, ShoppingCart } from "lucide-react";

export default function OrderFailedPage() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error") || "Payment transaction could not be processed.";

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-zinc-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white border border-zinc-150 p-8 md:p-10 rounded-3xl shadow-xl text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Warning Icon */}
        <div className="flex justify-center relative">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 animate-pulse">
            <AlertCircle className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Payment / Order Failed</h1>
          <p className="text-sm text-zinc-500 font-medium">
            We encountered a problem while processing your transaction. No funds were debited if the order was not created.
          </p>
        </div>

        {/* Error Detail Box */}
        <div className="bg-rose-50/50 border border-rose-100/60 rounded-2xl p-5 text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block mb-1">Reason</span>
          <p className="text-xs font-semibold text-rose-700 leading-relaxed">
            {errorMsg}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <Link href="/checkout" className="w-full">
            <button className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </Link>
          
          <Link href="/cart" className="w-full">
            <button className="w-full h-12 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
              <ShoppingCart className="w-4 h-4" />
              Return to Cart
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
