"use client";

import { useEffect, useState, useRef } from "react";
import { Check, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/utils/supabase/client";
import { addCartItem } from "@/lib/cart";
import toast from "react-hot-toast";
import ProductCard from "@/components/storefront/ProductCard";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  status: string | null;
  stock_quantity: number;
  moq?: number | null;
  images: string[];
  categories?: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
    } | null;
  } | null;
  product_reviews?: {
    rating: number;
  }[];
}

export default function FrequentlyBoughtTogether({
  currentProduct,
}: {
  currentProduct: any;
}) {
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === "left"
        ? scrollLeft - clientWidth * 0.8
        : scrollLeft + clientWidth * 0.8;

      scrollContainerRef.current.scrollTo({
        left: scrollTo,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    async function fetchFBT() {
      try {
        setLoading(true);
        // 1. Fetch explicitly linked frequently_bought products
        const { data: relations, error } = await supabase
          .from("related_products")
          .select("related:products!related_id(*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating))")
          .eq("product_id", currentProduct.id)
          .eq("relation_type", "frequently_bought")
          .eq("related.status", "Active");

        let fetchedProducts: Product[] = [];
        if (relations && !error) {
          fetchedProducts = relations
            .map((r: any) => r.related)
            .filter(Boolean);
        }

        // 2. Fallback: If no relations found, fetch 2 products from the same category or general active products
        if (fetchedProducts.length === 0) {
          let fallbackQuery = supabase
            .from("products")
            .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
            .neq("id", currentProduct.id)
            .eq("status", "Active");

          if (currentProduct.category_id) {
            fallbackQuery = fallbackQuery.eq("category_id", currentProduct.category_id);
          }

          const { data: fallbacks } = await fallbackQuery.limit(2);
          
          if (fallbacks && fallbacks.length > 0) {
            fetchedProducts = fallbacks;
          }

          // If still less than 2, fetch general active products
          if (fetchedProducts.length < 2) {
            const excludeIds = [currentProduct.id, ...fetchedProducts.map(p => p.id)];
            const { data: generalFallbacks } = await supabase
              .from("products")
              .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
              .neq("id", currentProduct.id)
              .not("id", "in", `(${excludeIds.join(",")})`)
              .eq("status", "Active")
              .limit(2 - fetchedProducts.length);

            if (generalFallbacks) {
              fetchedProducts = [...fetchedProducts, ...generalFallbacks];
            }
          }
        }

        setBundleProducts(fetchedProducts);
        // Pre-select all bundle products
        setSelectedIds(new Set(fetchedProducts.map((p) => p.id)));
      } catch (err) {
        console.error("Error fetching frequently bought together products:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFBT();
  }, [currentProduct.id, currentProduct.category_id, supabase]);

  if (loading || bundleProducts.length === 0) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Compute prices
  const currentPrice = currentProduct.sale_price || currentProduct.price;
  let totalPrice = Number(currentPrice);
  const selectedProducts = [currentProduct];

  bundleProducts.forEach((p) => {
    if (selectedIds.has(p.id)) {
      totalPrice += Number(p.sale_price || p.price);
      selectedProducts.push(p);
    }
  });

  const handleAddBundleToCart = () => {
    selectedProducts.forEach((p) => {
      addCartItem({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.sale_price || p.price,
        image_url: p.image_url || (p.images && p.images[0]) || null,
        moq: p.moq || 1,
      }, p.moq || 1);
    });
    toast.success(`Added ${selectedProducts.length} items to your cart!`);
  };

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <div className="mb-10 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Bundle & Save</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">Frequently Bought Together</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Products Grid with Connectors and scroll controls */}
        <div className="flex-1 relative group">
          {/* Navigation Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-zinc-950 text-white shadow-xl rounded-full flex items-center justify-center transition-all opacity-40 hover:opacity-100 hover:scale-110 hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-zinc-950 text-white shadow-xl rounded-full flex items-center justify-center transition-all opacity-40 hover:opacity-100 hover:scale-110 hidden md:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex flex-row items-center gap-4 p-4 md:p-6 border border-zinc-100 bg-zinc-50/30 rounded-[2.5rem] overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 px-4 md:px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Current Product Card Wrapper */}
            <div className="w-[200px] xs:w-[220px] shrink-0 relative snap-start">
              <ProductCard product={currentProduct} />
              <div className="absolute top-3 left-3 z-30 w-6 h-6 rounded-md bg-zinc-950 text-white flex items-center justify-center border border-zinc-950 shadow-md">
                <Check className="w-4 h-4" />
              </div>
              <div className="absolute top-3 right-12 z-30 bg-zinc-950/80 backdrop-blur-sm text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-sm shadow-md pointer-events-none">
                This Item
              </div>
            </div>

            {/* Map bundle items */}
            {bundleProducts.map((p) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div key={p.id} className="contents">
                  <div className="text-zinc-300 font-bold text-2xl select-none shrink-0">+</div>
                  
                  <div className={`w-[200px] xs:w-[220px] shrink-0 relative transition-all snap-start ${isSelected ? 'opacity-100' : 'opacity-50'}`}>
                    <ProductCard product={p as any} />
                    
                    {/* Select Checkbox Button Overlay */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSelect(p.id);
                      }}
                      className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-md flex items-center justify-center transition-all border shadow-md active:scale-95 ${isSelected
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-zinc-300 text-transparent hover:border-zinc-400'
                        }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Bundle Card */}
        <div className="w-full lg:w-[320px] bg-white border border-zinc-200 p-8 rounded-[2.5rem] flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Bundle Price</p>
              <h3 className="text-3xl font-black tracking-tight mt-1 text-zinc-900">{formatCurrency(totalPrice)}</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">For {selectedProducts.length} selected items</p>
            </div>

            <div className="border-t border-zinc-100 pt-6 space-y-3">
              {selectedProducts.map((p, idx) => (
                <div key={p.id} className="flex justify-between items-start gap-4 text-sm">
                  <span className="text-zinc-600 font-medium line-clamp-1 flex-1 text-left">
                    {idx + 1}. {p.name}
                  </span>
                  <span className="font-bold text-zinc-900">
                    {formatCurrency(p.sale_price || p.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddBundleToCart}
            className="w-full h-12 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 mt-8 shadow-sm active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" />
            Add Bundle to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
