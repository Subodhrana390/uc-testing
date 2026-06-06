"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import {
  getCartItems,
  getCartTotal,
  removeCartItem,
  updateCartItemQuantity,
  type CartItem,
} from "@/lib/cart";

import { formatCurrency } from "@/lib/format";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(getCartItems());

    sync();

    window.addEventListener("cart-updated", sync);

    return () =>
      window.removeEventListener("cart-updated", sync);
  }, []);

  return (
    <div className="bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_100%)]">
      <section className="container mx-auto px-4 py-14">
        {/* Header */}
        <div className="mb-8 space-y-3">

          <h1 className="text-4xl font-black tracking-tight text-zinc-950">
            Your shopping cart
          </h1>

          <p className="text-sm text-zinc-600">
            Review product quantity, update items, or continue to
            quote and order discussion.
          </p>
        </div>

        {/* Empty Cart */}
        {!items.length ? (
          <div className="border border-dashed border-orange-200 bg-white p-12 text-center rounded-2xl">
            <ShoppingCart className="mx-auto h-12 w-12 text-primary" />

            <p className="mt-4 text-sm font-semibold text-zinc-600">
              Your cart is empty.
            </p>

            <Link
              href="/products"
              className="mt-4 inline-block text-sm font-black uppercase tracking-widest text-primary"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            {/* Cart Items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 border border-orange-100 bg-white p-5 shadow-sm rounded-2xl md:flex-row md:items-center"
                >
                  {/* Product Image */}
                  <div className="relative h-28 w-28 shrink-0 rounded-xl overflow-hidden">
                    <Image
                      src={
                        item.image_url ||
                        "/images/prod_main.png"
                      }
                      alt={item.name}
                      fill
                      className="object-contain p-4"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 space-y-2">
                    <Link
                      href={`/products/${item.slug}`}
                      className="text-lg font-bold text-zinc-950 hover:text-primary transition-colors"
                    >
                      {item.name}
                    </Link>

                    <p className="text-sm font-semibold text-zinc-600">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-100 transition"
                      onClick={() =>
                        updateCartItemQuantity(
                          item.id,
                          item.quantity - 1
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <span className="min-w-8 text-center font-bold">
                      {item.quantity}
                    </span>

                    <button
                      className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-100 transition"
                      onClick={() =>
                        updateCartItemQuantity(
                          item.id,
                          item.quantity + 1
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition"
                    onClick={() => removeCartItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="h-fit border border-zinc-200 bg-white p-6 shadow-sm rounded-2xl">
              <h2 className="text-2xl font-black text-zinc-950">
                Order Summary
              </h2>

              <div className="mt-4 flex items-center justify-between border-b border-zinc-100 pb-4 text-sm font-semibold text-zinc-600">
                <span>Total items</span>

                <span>
                  {items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-lg font-black text-zinc-950">
                <span>Total</span>

                <span>{formatCurrency(getCartTotal())}</span>
              </div>

              <div className="mt-6 space-y-3">
                <Link href="/checkout" className="block">
                  <button className="w-full h-11 rounded-xl bg-zinc-950 hover:bg-primary text-white font-bold transition">
                    Proceed to Checkout
                  </button>
                </Link>

                <Link href="/products" className="block">
                  <button className="w-full h-11 rounded-xl border border-zinc-300 hover:bg-zinc-100 font-bold transition">
                    Continue Shopping
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}