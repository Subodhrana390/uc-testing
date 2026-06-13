"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number | string;
    sale_price?: number | string | null;
    image_url?: string | null;
    stock_quantity?: number;
  };
  quantity?: number;
  className?: string;
  label?: string;
  allowRemove?: boolean;
};

export default function AddToCartButton({
  product,
  quantity = 1,
  className,
  label = "Add to Cart",
  allowRemove = true,
}: Props) {
  const { addItem, removeItem, isInCart } = useCartStore();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const isAdded = isMounted ? isInCart(product.id) : false;
  const isOutOfStock = product.stock_quantity === 0;

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => {
        if (isAdded && allowRemove) {
          removeItem(product.id);
          return;
        }

        const price = Number(product.sale_price || product.price) || 0;

        addItem(
          {
            id: product.id,
            slug: product.slug,
            name: product.name,
            price,
            image_url: product.image_url || "",
          },
          quantity
        );
      }}
      className={`
        inline-flex items-center justify-center
        px-5 py-3 rounded-xl
        font-semibold text-sm
        transition-all duration-200
        active:scale-95
        ${isOutOfStock 
          ? "bg-zinc-200 hover:bg-zinc-200 text-zinc-500 cursor-not-allowed"
          : isAdded
          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
          : "bg-black hover:bg-zinc-800 text-white"
        }
        ${className || ""}
      `}
    >
      {isOutOfStock ? null : isAdded ? (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" />
      )}

      {isOutOfStock 
        ? "Out of Stock" 
        : isAdded
        ? allowRemove
          ? "Remove from Cart"
          : "Added to Cart"
        : label}
    </button>
  );
}
