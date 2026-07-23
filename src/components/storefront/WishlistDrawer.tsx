"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Heart, ShoppingCart, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { formatCurrency, getExclusivePrice } from "@/lib/format";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WishlistDrawer({ isOpen, onClose }: WishlistDrawerProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const supabase = createClient();
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  async function fetchWishlist() {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("wishlist")
        .select(`*, products (*)`)
        .eq("user_id", user.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  }

  const removeFromWishlist = async (id: string, silent = false) => {
    setRemovingId(id);
    try {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("id", id);

      if (error) throw error;

      window.dispatchEvent(new CustomEvent("wishlist-updated"));
      if (!silent) {
        toast.success("Removed from wishlist");
      }
      await fetchWishlist();
    } catch (error) {
      if (!silent) {
        toast.error("Error removing item");
      }
    } finally {
      setRemovingId(null);
    }
  };

  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = async (item: any) => {
    if (!item.products) return;
    setAddingToCart(item.id);
    try {
      addItem({
        id: item.products.id,
        slug: item.products.slug,
        name: item.products.name,
        price: Number(item.products.price),
        image_url: item.products.image_url || "",
        hsn_code: item.products.hsn_code || undefined,
        is_tax_inclusive: item.products.is_tax_inclusive,
        igst_rate: item.products.igst_rate,
      });
      await removeFromWishlist(item.id, true);
      toast.success("Added to cart");
    } catch (error) {
      toast.error("Error adding to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  useEffect(() => {
    if (isAuthInitialized && user && isOpen) {
      fetchWishlist();
    }
  }, [user, isAuthInitialized, isOpen]);

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

  // Sync count on events
  useEffect(() => {
    if (user) {
      window.addEventListener("wishlist-updated", fetchWishlist);
      return () => {
        window.removeEventListener("wishlist-updated", fetchWishlist);
      };
    }
  }, [user]);

  if (!isAuthInitialized) return null;

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
                <Heart className="w-5 h-5 text-primary fill-primary" />
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                  Wishlist ({items.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-zinc-900"
                aria-label="Close wishlist"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
              {!user ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800">Please Login</h3>
                  <p className="text-xs text-zinc-400 max-w-[200px]">
                    You need to be logged in to view your wishlist.
                  </p>
                  <Link prefetch={false} href="/login" onClick={onClose} className="block w-full">
                    <button className="px-6 py-2 bg-zinc-950 hover:bg-primary text-white text-xs font-bold rounded-lg transition-all w-full">
                      Login to Account
                    </button>
                  </Link>
                </div>
              ) : loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800">Your wishlist is empty</h3>
                  <p className="text-xs text-zinc-400 max-w-[200px]">
                    Explore our products and save your favorites here.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-zinc-950 hover:bg-primary text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Discover Products
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
                      {item.products?.image_url ? (
                        <Image
                          src={item.products.image_url}
                          alt={item.products.name}
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
                        <Link prefetch={false}
                          href={`/products/${item.products?.slug}`}
                          onClick={onClose}
                          className="text-xs font-bold text-zinc-800 hover:text-primary transition-colors block truncate"
                        >
                          {item.products?.name}
                        </Link>
                        <p className="text-[10px] font-black text-zinc-900 mt-1">
                          {formatCurrency(
                            getExclusivePrice(
                              item.products?.price,
                              item.products?.is_tax_inclusive,
                              item.products?.igst_rate
                            )
                          )}
                          <span className="text-[8px] font-bold text-zinc-500 uppercase ml-1">
                            + GST
                          </span>
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          onClick={() => removeFromWishlist(item.id)}
                          disabled={removingId === item.id}
                          className="text-xs font-bold text-zinc-400 hover:text-red-500 p-1 transition-colors"
                        >
                          {removingId === item.id ? (
                            "..."
                          ) : (
                            "Remove"
                          )}
                        </button>
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={
                            addingToCart === item.id ||
                            item.products?.stock_quantity === 0
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                            item.products?.stock_quantity === 0
                              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                              : "bg-zinc-900 hover:bg-primary text-white"
                          }`}
                        >
                          {addingToCart === item.id ? (
                            "..."
                          ) : item.products?.stock_quantity === 0 ? (
                            "Sold Out"
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t border-zinc-150 bg-zinc-50/80 shrink-0">
                <Link prefetch={false} href="/account/wishlist" onClick={onClose} className="block text-center">
                  <span className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors py-1 inline-block">
                    View Full Wishlist &rarr;
                  </span>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
