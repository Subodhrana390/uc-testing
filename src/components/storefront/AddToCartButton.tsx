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
    image_url?: string | null;
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

  return (
    <button
      type="button"
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
          Number(product.price) || 0;

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
        ${isAdded
          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
          : "bg-black hover:bg-zinc-800 text-white"
        }
        ${className || ""}
      `}
    >
      {isAdded ? (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" />
      )}

      {isAdded
        ? allowRemove
          ? "Remove from Cart"
          : "Added to Cart"
        : label}
    </button>
  );
}