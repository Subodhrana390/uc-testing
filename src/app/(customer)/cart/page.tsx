"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  ChevronLeft,
  PackageSearch,
  Lock,
} from "lucide-react";

import WishlistToggleButton from "@/components/storefront/WishlistToggleButton";

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
    <div className="bg-[linear-gradient(180deg,#fcfcfd_0%,#ffffff_100%)] min-h-[calc(100vh-80px)]">
      <section className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-zinc-950 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950">
            Your Cart
          </h1>
          <p className="text-sm sm:text-base font-medium text-zinc-500">
            Review your selected items and proceed to checkout.
          </p>
        </div>

        {/* Empty Cart */}
        {!items.length ? (
          <div className="space-y-12 pb-12">
            <div className="border border-zinc-100 bg-white p-12 sm:p-16 text-center rounded-3xl shadow-sm max-w-2xl mx-auto mt-4">
              <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <PackageSearch className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black text-zinc-950 mb-3">Your cart is empty</h2>
              <p className="text-zinc-500 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                Looks like you haven't added any products to your cart yet. Explore our catalog to find what you need.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-zinc-950 text-white font-bold hover:bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
              >
                Browse Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] pb-12">
            {/* Cart Items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 sm:gap-6 border border-zinc-100 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow rounded-2xl group"
                >
                  <div className="relative h-24 w-24 sm:h-32 sm:w-32 shrink-0 rounded-xl overflow-hidden">
                    <Image
                      src={item.image_url || "/images/prod_main.png"}
                      alt={item.name}
                      fill
                      sizes="128px"
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Product Info & Actions */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div className="flex justify-between gap-4 items-start">
                      <div className="space-y-1.5">
                        <Link
                          href={`/products/${item.slug}`}
                          className="text-sm sm:text-base font-bold text-zinc-950 hover:text-primary transition-colors line-clamp-2 leading-snug pr-4"
                        >
                          {item.name}
                        </Link>

                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm sm:text-base font-black text-zinc-950">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        {item.moq > 1 && (
                          <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                            MOQ: {item.moq}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200/80 rounded-lg p-1 shrink-0">
                        <button
                          className={`rounded-md p-1.5 transition-all ${
                            item.quantity <= (item.moq || 1)
                              ? "text-zinc-300 cursor-not-allowed"
                              : "text-zinc-500 hover:text-zinc-950 hover:bg-white hover:shadow-sm active:scale-95"
                          }`}
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= (item.moq || 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center font-bold text-sm">
                          {item.quantity}
                        </span>
                        <button
                          className="rounded-md p-1.5 text-zinc-500 hover:text-zinc-950 hover:bg-white hover:shadow-sm active:scale-95 transition-all"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Save to Wishlist */}
                        <WishlistToggleButton
                          productId={item.id}
                          label="Save"
                          onAdded={() => removeCartItem(item.id)}
                          className="!h-auto !py-1.5 !px-3 !bg-transparent !border-transparent text-xs sm:text-sm font-bold text-zinc-400 hover:!text-primary hover:!bg-primary/5 !rounded-lg"
                        />

                        {/* Remove Button */}
                        <button
                          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                          onClick={() => removeCartItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="h-fit border border-zinc-200 bg-white shadow-sm rounded-3xl overflow-hidden sticky top-24">
              <div className="p-6 sm:p-8 bg-zinc-50/50 border-b border-zinc-100">
                <h2 className="text-xl font-black text-zinc-950">
                  Order Summary
                </h2>
              </div>
              <div className="p-6 sm:p-8 space-y-4">
                {/* Items List in Summary */}
                <div className="space-y-3 pb-5 border-b border-zinc-100">
                  {items.map((item) => (
                    <div key={`summary-${item.id}`} className="flex justify-between text-sm">
                      <div className="flex gap-2 min-w-0 pr-4">
                        <span className="font-bold text-zinc-950">{item.quantity} ×</span>
                        <span className="text-zinc-600 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-zinc-950 shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm font-medium text-zinc-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-bold text-zinc-950">{formatCurrency(getCartTotal())}</span>
                </div>

                <div className="flex items-center justify-between text-sm font-medium text-zinc-600">
                  <span>Estimated Shipping</span>
                  <span className="font-bold text-zinc-950">Calculated at checkout</span>
                </div>

                <div className="flex justify-between text-sm font-medium text-zinc-600 pb-6 border-b border-zinc-100">
                  <span>Estimated Tax</span>
                  <span className="font-bold text-zinc-950 text-right max-w-[200px] leading-tight">
                    Calculated at checkout<br />
                  </span>
                </div>

                <div className="flex items-center justify-between text-lg pt-2">
                  <span className="font-black text-zinc-950">Total</span>
                  <span className="font-black text-primary text-xl">{formatCurrency(getCartTotal())}</span>
                </div>

                <div className="pt-6 space-y-4">
                  <Link href="/checkout" className="block">
                    <button className="w-full h-14 rounded-xl bg-zinc-950 hover:bg-primary hover:shadow-lg hover:shadow-primary/20 text-white font-bold text-base transition-all active:scale-[0.98]">
                      Proceed to Checkout
                    </button>
                  </Link>

                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 pt-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secure Encrypted Checkout</span>
                  </div>

                  <div className="flex justify-center gap-3 pt-4 border-t border-zinc-100 mt-2">
                    <div className="w-12 h-7 bg-white rounded-md flex items-center justify-center border border-zinc-200 shadow-sm" title="Visa">
                      <span className="text-[10px] font-black italic text-[#1434CB]">VISA</span>
                    </div>
                    <div className="w-12 h-7 bg-white rounded-md flex items-center justify-center border border-zinc-200 shadow-sm" title="Mastercard">
                      <span className="text-[10px] font-black italic text-[#EB001B]">MASTER</span>
                    </div>
                    <div className="w-12 h-7 bg-white rounded-md flex items-center justify-center border border-zinc-200 shadow-sm" title="UPI">
                      <span className="text-[10px] font-black tracking-wide text-zinc-800">UPI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
