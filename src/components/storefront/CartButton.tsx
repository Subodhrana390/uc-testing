"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useEffect, useState } from "react";

export default function CartButton({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  const cartCount = useCartStore((state) => state.items.length);

  // Hydration fix for Zustand persist
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const count = isMounted ? cartCount : 0;

  return (
    <Link prefetch={false}
      href="/cart"
      onClick={(e) => {
        if (window.innerWidth < 640 && onClick) {
          e.preventDefault();
          onClick(e);
        }
      }}
      className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-primary transition-colors"
      aria-label="Cart"
    >
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
