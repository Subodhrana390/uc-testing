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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([currentProduct.id]));
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
        // Pre-select all bundle products + current product
        setSelectedIds(new Set([currentProduct.id, ...fetchedProducts.map((p) => p.id)]));
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
  let baseTotalPrice = 0;
  const selectedProducts: Product[] = [];
  const allProducts = [currentProduct, ...bundleProducts];

  allProducts.forEach((p) => {
    if (selectedIds.has(p.id)) {
      baseTotalPrice += Number(p.sale_price || p.price);
      selectedProducts.push(p);
    }
  });

  const isBundleEligible = selectedProducts.length > 1;
  const discountPercentage = 10; // 10% discount
  const discountMultiplier = isBundleEligible ? (100 - discountPercentage) / 100 : 1;
  const totalPrice = baseTotalPrice * discountMultiplier;

  const handleAddBundleToCart = () => {
    selectedProducts.forEach((p) => {
      const originalPrice = p.sale_price || p.price;
      const finalPrice = originalPrice * discountMultiplier;

      addCartItem({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: finalPrice,
        image_url: p.image_url || (p.images && p.images[0]) || null,
      }, 1);
    });
    
    if (isBundleEligible) {
      toast.success(`Added ${selectedProducts.length} items to your cart with a ${discountPercentage}% bundle discount!`);
    } else {
      toast.success(`Added 1 item to your cart!`);
    }
  };

  return (
    <div className="mt-8 border-t border-zinc-100 pt-8">
      <div className="mb-6 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Bundle & Save</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">Frequently Bought Together</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Products Grid with Connectors and scroll controls */}
        <div className="flex-1 relative group w-full overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="flex flex-row items-center justify-start gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Current Product Card Wrapper */}
            <div className={`w-[180px] sm:w-[200px] shrink-0 relative snap-start transition-all ${selectedIds.has(currentProduct.id) ? 'opacity-100' : 'opacity-50'}`}>
              <ProductCard product={currentProduct} />
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleSelect(currentProduct.id);
                }}
                className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-md flex items-center justify-center transition-all border shadow-md active:scale-95 ${selectedIds.has(currentProduct.id)
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white border-zinc-300 text-transparent hover:border-zinc-400'
                  }`}
              >
                <Check className="w-4 h-4" />
              </button>
              
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
                  
                  <div className={`w-[180px] sm:w-[200px] shrink-0 relative transition-all snap-start ${isSelected ? 'opacity-100' : 'opacity-50'}`}>
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
        <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0 bg-white p-4 flex flex-col gap-6 relative overflow-hidden self-start">
          <div className="relative z-10 space-y-4">
            <div className="space-y-3">
              {allProducts.map((p, idx) => {
                const isSelected = selectedIds.has(p.id);
                const isCurrentProduct = p.id === currentProduct.id;
                
                return (
                  <div key={p.id} className="flex justify-between items-start gap-3 text-sm group">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <div className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm ${isSelected ? 'bg-primary border-primary text-white' : 'bg-white border-zinc-300 text-transparent group-hover:border-zinc-400'}`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className={`font-medium line-clamp-2 text-left transition-colors ${isSelected ? 'text-zinc-800' : 'text-zinc-400 line-through'}`}>
                        {isCurrentProduct && <strong className="text-zinc-950 font-bold mr-1">This item:</strong>}
                        {p.name}
                      </span>
                    </label>
                    <span className={`font-bold shrink-0 transition-colors ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {formatCurrency(p.sale_price || p.price)}
                    </span>
                    {/* Invisible input to make the label click area work cleanly for accessibility/forms if needed, but onClick on label handles it via bubbling if we use standard inputs. We will just use an onChange input */}
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Bundle Price</p>
                {isBundleEligible && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
                    Save {discountPercentage}%
                  </span>
                )}
              </div>
              <div className="flex items-end gap-3 mt-1">
                <h3 className="text-3xl font-black tracking-tight text-zinc-900">{formatCurrency(totalPrice)}</h3>
                {isBundleEligible && (
                  <span className="text-sm text-zinc-400 line-through font-bold mb-1">{formatCurrency(baseTotalPrice)}</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-1">For {selectedProducts.length} selected items</p>
            </div>
          </div>

          <button
            onClick={handleAddBundleToCart}
            disabled={selectedProducts.length === 0}
            className="w-full h-12 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <ShoppingCart className="w-4 h-4" />
            {selectedProducts.length > 1 ? `Add ${selectedProducts.length} Items to Cart` : selectedProducts.length === 1 ? 'Add to Cart' : 'Select Items'}
          </button>
        </div>
      </div>
    </div>
  );
}
