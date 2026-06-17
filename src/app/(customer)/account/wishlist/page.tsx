"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2, ArrowRight, Star, AlertCircle, Package, Bookmark, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency, getExclusivePrice } from "@/lib/format";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const supabase = createClient();

  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    if (isAuthInitialized) {
      if (user) {
        fetchWishlist();
      } else {
        setLoading(false);
      }
    }
  }, [user, isAuthInitialized]);

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
    } catch (error: any) {
      toast.error("Error fetching wishlist");
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
    } catch (error: any) {
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
    } catch (error) {
      toast.error("Error adding to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Wishlist & Saved Items</h1>
          <p className="text-sm text-zinc-500 mt-1">Keep track of priority tools, electronics, and materials</p>
        </div>
        <Badge variant="secondary" className="bg-zinc-100 text-zinc-800 border-zinc-200 px-3 py-1 text-xs w-fit">
          {items.length} {items.length === 1 ? 'Item' : 'Items'}
        </Badge>
      </div>

      {/* Wishlist Items */}
      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="border-zinc-200 overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">

              {/* Product Image */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-lg relative shrink-0 overflow-hidden border border-zinc-100 mx-auto md:mx-0">
                <Image
                  src={item.products?.image_url || "/images/placeholder.png"}
                  alt={item.products?.name || "Product"}
                  fill
                  sizes="96px"
                  className="object-contain p-2"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0 space-y-1.5 text-center md:text-left w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">
                    Ref: {item.products?.id?.slice(0, 8)?.toUpperCase()}
                  </span>
                  <div className="flex justify-center md:justify-start text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 leading-snug line-clamp-2">
                  <Link href={`/products/${item.products?.slug}`} className="hover:text-red-650 transition-colors">
                    {item.products?.name}
                  </Link>
                </h3>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                  <span className="text-base sm:text-lg font-bold text-zinc-900 flex items-baseline gap-1">
                    {formatCurrency(getExclusivePrice(item.products?.price, item.products?.is_tax_inclusive, item.products?.igst_rate))}
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">+ GST</span>
                  </span>
                  {item.products?.stock_quantity === 0 ? (
                    <Badge variant="outline" className="text-[10px] uppercase text-zinc-500 bg-zinc-100 border-zinc-200">
                      Out of Stock
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] uppercase text-emerald-700 bg-emerald-50 border-emerald-200">
                      <Package className="w-3 h-3 mr-1" /> In Stock
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 mt-4 md:mt-0">
                <Button
                  onClick={() => handleAddToCart(item)}
                  disabled={addingToCart === item.id || item.products?.stock_quantity === 0}
                  className={`h-10 px-6 rounded-lg font-medium text-sm w-full md:w-[150px] flex items-center justify-center gap-2 ${item.products?.stock_quantity === 0 ? "bg-zinc-200 text-zinc-500 hover:bg-zinc-200" : "bg-red-600 hover:bg-red-700 text-white"}`}
                >
                  {addingToCart === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : item.products?.stock_quantity === 0 ? (
                    <>Out of Stock</>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => removeFromWishlist(item.id)}
                  disabled={removingId === item.id}
                  className="h-10 px-6 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm w-full md:w-[150px] flex items-center justify-center gap-2 border border-zinc-200 md:border-transparent"
                >
                  {removingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {items.length === 0 && (
          <Card className="border-zinc-200 border-dashed">
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Your wishlist is empty</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-1">
                  Start searching our catalogue for products to add to your list.
                </p>
              </div>
              <Link href="/products" className="inline-block">
                <Button className="bg-red-600 hover:bg-red-700 text-white h-9 px-6 text-sm">
                  Discover Products <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
