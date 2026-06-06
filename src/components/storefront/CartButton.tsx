"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCartCount } from "@/lib/cart";

export default function CartButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(getCartCount());
    sync();
    window.addEventListener("cart-updated", sync);
    return () => window.removeEventListener("cart-updated", sync);
  }, []);

  return (
    <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-primary transition-colors">
      <div className="relative">
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white shadow-sm">
            {count}
          </span>
        )}
      </div>
      <span className="hidden sm:inline">Cart</span>
    </Link>
  );
}
