"use client";

import { useEffect, useState } from "react";

import {
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";

import {
  addCartItem,
  isInCart,
  removeCartItem,
} from "@/lib/cart";

import toast from "react-hot-toast";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number | string;
    sale_price?: number | string | null;
    image_url?: string | null;
    moq?: number | null;
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
  const [isAdded, setIsAdded] =
    useState(false);

  useEffect(() => {
    const sync = () =>
      setIsAdded(isInCart(product.id));

    sync();

    window.addEventListener(
      "cart-updated",
      sync
    );

    return () =>
      window.removeEventListener(
        "cart-updated",
        sync
      );
  }, [product.id]);

  const isOutOfStock = product.stock_quantity === 0;

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => {
        console.log(
          "Add to Cart clicked",
          product.id,
          quantity
        );

        if (isAdded && allowRemove) {
          removeCartItem(product.id);

          toast.success(
            `${product.name} removed from cart`
          );

          return;
        }

        const price =
          Number(product.sale_price || product.price) || 0;

        addCartItem(
          {
            id: product.id,
            slug: product.slug,
            name: product.name,
            price,
            image_url:
              product.image_url,
          },
          quantity
        );

        toast.success(
          `${product.name} added to cart`
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
