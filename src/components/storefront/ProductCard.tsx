"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingCart, Check, Loader2 } from "lucide-react";
import { formatCurrency, getExclusivePrice } from "@/lib/format";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-hot-toast";
import { useLoginRedirect } from "@/hooks/useLoginRedirect";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    sale_price: number | null;
    is_tax_inclusive?: boolean;
    igst_rate?: number;
    image_url: string | null;
    status: string | null;
    stock_quantity: number;
    hsn_code?: string | null;
    categories?: {
      name: string;
      slug: string;
      parent?: {
        name: string;
        slug: string;
      } | null;
    } | null;
    category_name?: string;
    category_slug?: string;
    parent_category_name?: string;
    parent_category_slug?: string;
    product_reviews?: {
      rating: number;
    }[];
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const isAdded = useCartStore((state) => state.items.some((i) => i.id === product.id));
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  const [isMounted, setIsMounted] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { redirectToLogin } = useLoginRedirect();

  useEffect(() => {
    setIsMounted(true);

    async function checkWishlist() {
      if (!user) return;

      const { data } = await supabase
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .single();

      if (data) setInWishlist(true);
      else setInWishlist(false);
    }

    if (isAuthInitialized) {
      checkWishlist();
    }
  }, [product.id, supabase, user, isAuthInitialized]);

  const inCart = isMounted ? isAdded : false;

  const price = Number(product.price);
  const salePrice = product.sale_price ? Number(product.sale_price) : 0;
  const discount = (salePrice > 0 && price > 0 && price > salePrice)
    ? Math.round(((price - salePrice) / price) * 100)
    : null;

  const reviews = product.product_reviews || [];
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const displayCategory = product.categories?.name || product.category_name || "Industrial";

  const toggleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) {
      removeItem(product.id);
    } else {
      addItem({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.sale_price || product.price,
        image_url: product.image_url || "",
        hsn_code: product.hsn_code || undefined,
        is_tax_inclusive: product.is_tax_inclusive,
        igst_rate: product.igst_rate,
      });
    }
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please login to save to wishlist");
      redirectToLogin();
      return;
    }

    setLoading(true);
    try {
      if (inWishlist) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", product.id);

        if (!error) {
          setInWishlist(false);
          toast.success("Removed from wishlist");
        }
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({
            user_id: user.id,
            product_id: product.id
          });

        if (!error) {
          setInWishlist(true);
          toast.success("Added to wishlist");
        }
      }
      // Notify other components
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
    } catch (err) {
      toast.error("Failed to update wishlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-nosnippet className="group/prodcard relative flex flex-col bg-transparent transition-all h-full overflow-hidden rounded-2xl">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <Link prefetch={false} href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-label={product.name}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
              className="object-contain p-3.5 transition-transform duration-700 group-hover/prodcard:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-50 flex items-center justify-center">
              <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest text-center">No Image</span>
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
          {discount && (
            <div className="bg-primary text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              {discount}% OFF
            </div>
          )}
          {product.status === "New" && (
            <div className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              New
            </div>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={toggleWishlist}
          disabled={loading}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full transition-all shadow-sm active:scale-95 ${inWishlist
            ? "bg-rose-500 text-white"
            : "bg-white/95 backdrop-blur-sm text-zinc-400 hover:text-rose-500 hover:bg-white"
            }`}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Heart className={`w-3 h-3 ${inWishlist ? "fill-current" : ""}`} />
          )}
        </button>
      </div>

      {/* Content Section */}
      <Link prefetch={false} href={`/products/${product.slug}`} className="px-2.5 pt-2.5 pb-1 space-y-1.5 flex-1 flex flex-col">
        {/* Category & Rating */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[75%]" title={displayCategory}>{displayCategory}</span>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 text-amber-500">
              <Star className="h-3 w-3 fill-amber-500" />
              <span className="text-[11px] font-black text-zinc-900">{avgRating}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-bold ml-1">({reviews.length})</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xs font-bold text-zinc-900 line-clamp-2 leading-tight group-hover/prodcard:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-zinc-950 leading-none">
                {formatCurrency(getExclusivePrice(product.sale_price || product.price, product.is_tax_inclusive, product.igst_rate))}
              </span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">+ GST</span>
            </div>
            {product.sale_price && (
              <span className="text-[10px] text-zinc-400 line-through mt-0.5 font-bold">
                {formatCurrency(getExclusivePrice(product.price, product.is_tax_inclusive, product.igst_rate))}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Bottom Action Bar with expanded Cart button */}
      <div className="px-2.5 pb-2.5">
        <button
          onClick={toggleCart}
          disabled={product.stock_quantity === 0}
          className={`w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(0,0,0,0.02)] active:scale-[0.97] whitespace-nowrap ${product.stock_quantity === 0
            ? "bg-zinc-200 text-zinc-500 cursor-not-allowed"
            : inCart
              ? "bg-emerald-600 text-white"
              : "bg-primary text-white hover:bg-zinc-950"
            }`}
        >
          {product.stock_quantity === 0 ? (
            <>Out of Stock</>
          ) : inCart ? (
            <>In Cart <Check className="w-4 h-4" /></>
          ) : (
            <>Add To Cart <ShoppingCart className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
