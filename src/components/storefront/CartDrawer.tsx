"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { formatCurrency, getExclusivePrice } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, getCartTotal } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isMounted) return null;

  const exclusiveTotal = items.reduce(
    (total, item) =>
      total +
      getExclusivePrice(
        item.price * item.quantity,
        item.is_tax_inclusive,
        item.igst_rate
      ),
    0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100]"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-2xl z-[101] flex flex-col h-full text-zinc-900"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                  Shopping Cart ({items.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800">Your cart is empty</h3>
                  <p className="text-xs text-zinc-400 max-w-[200px]">
                    Looks like you haven't added anything to your cart yet.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-zinc-950 hover:bg-primary text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 border border-zinc-100 p-3 rounded-xl hover:shadow-xs transition-all"
                  >
                    {/* Item Image */}
                    <div className="relative w-14 h-14 shrink-0 bg-zinc-50 rounded-lg overflow-hidden flex items-center justify-center">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <span className="text-[8px] text-zinc-400 font-bold uppercase text-center">
                          No Image
                        </span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={onClose}
                          className="text-xs font-bold text-zinc-800 hover:text-primary transition-colors block truncate"
                        >
                          {item.name}
                        </Link>
                        {item.variant_attributes && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.variant_attributes).map(
                              ([key, val]) => (
                                <span
                                  key={key}
                                  className="text-[9px] font-semibold text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200/50"
                                >
                                  {val as string}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Controls and Price */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        {/* Quantity selector */}
                        <div className="flex items-center border border-zinc-200 rounded-lg p-0.5 bg-zinc-50/50">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-zinc-500 hover:text-zinc-950 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-zinc-500 hover:text-zinc-950 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-zinc-900">
                            {formatCurrency(
                              getExclusivePrice(
                                item.price * item.quantity,
                                item.is_tax_inclusive,
                                item.igst_rate
                              )
                            )}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-zinc-400 hover:text-red-500 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-4 border-t border-zinc-150 bg-zinc-50/80 shrink-0 space-y-3">
                <div className="space-y-1 text-xs text-zinc-500">
                  <div className="flex justify-between">
                    <span>Subtotal (Excl. GST)</span>
                    <span className="font-semibold text-zinc-800">
                      {formatCurrency(exclusiveTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated GST</span>
                    <span className="font-semibold text-zinc-800">
                      {formatCurrency(getCartTotal() - exclusiveTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200/80 pt-2 text-xs font-bold text-zinc-900">
                    <span>Total (Incl. GST)</span>
                    <span className="text-primary font-black">{formatCurrency(getCartTotal())}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Link href="/checkout" onClick={onClose} className="block">
                    <button className="w-full h-10 bg-zinc-950 hover:bg-primary text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]">
                      Proceed to Checkout
                    </button>
                  </Link>
                  <Link href="/cart" onClick={onClose} className="block text-center">
                    <span className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors py-1 inline-block">
                      View Full Cart &rarr;
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
