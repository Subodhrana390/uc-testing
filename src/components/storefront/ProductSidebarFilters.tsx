"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductSidebarFilters({
  categories,
  brands = [],
  attributes = [],
  currentCategorySlug,
  activeParentCategory,
  activeSiblingCategories
}: {
  categories: any[];
  brands?: any[];
  attributes?: any[];
  currentCategorySlug?: string;
  activeParentCategory?: any;
  activeSiblingCategories?: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = currentCategorySlug || searchParams.get("category") || "all";
  const inStockOnly = searchParams.get("in_stock") === "true";
  const promoOnly = searchParams.get("promo") === "true";
  const outOfStockOnly = searchParams.get("out_of_stock") === "true";
  const selectedBrands = searchParams.get("brand")?.split(",").map(b => b.trim()).filter(Boolean) || [];
  const selectedRating = searchParams.get("rating") ? parseInt(searchParams.get("rating") as string) : null;
  const urlMinPrice = searchParams.get("min_price");
  const urlMaxPrice = searchParams.get("max_price");

  // Local state for price range slider
  const [minPrice, setMinPrice] = useState(urlMinPrice ? parseInt(urlMinPrice) : 0);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice ? parseInt(urlMaxPrice) : 200000);

  // Sync range slider with URL if URL changes
  useEffect(() => {
    setMinPrice(urlMinPrice ? parseInt(urlMinPrice) : 0);
    setMaxPrice(urlMaxPrice ? parseInt(urlMaxPrice) : 200000);
  }, [urlMinPrice, urlMaxPrice]);

  // Handle reset triggered from mobile filter drawer's "Clear All" button
  useEffect(() => {
    const handleReset = () => {
      setMinPrice(0);
      setMaxPrice(200000);
      router.push(window.location.pathname, { scroll: false });
    };
    window.addEventListener("reset-mobile-filters", handleReset);
    return () => window.removeEventListener("reset-mobile-filters", handleReset);
  }, [router]);

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all" || value === "false" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // Reset page to 1 when filters change
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCategoryClick = (slug: string) => {
    if (slug === "all") {
      router.push('/products');
    } else if (window.location.pathname.startsWith('/categories/')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      router.push(`/categories/${slug}?${params.toString()}`);
    } else {
      updateFilters("category", slug);
    }
  };

  const updateMultipleFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "false" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete("page");
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  const setPricePreset = (min: number | null, max: number | null) => {
    setMinPrice(min !== null ? min : 0);
    setMaxPrice(max !== null ? max : 200000);
    updateMultipleFilters({
      min_price: min !== null ? min.toString() : null,
      max_price: max !== null ? max.toString() : null
    });
  };

  const renderStars = (count: number) => (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < count ? "fill-amber-500 text-amber-500" : "text-zinc-200"
          )}
        />
      ))}
    </div>
  );


  return (
    <>
      <div className="flex justify-between items-center px-1 pb-1">
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-950">Filters</h2>
        <button
          onClick={() => {
            setMinPrice(0);
            setMaxPrice(200000);
            router.push(window.location.pathname, { scroll: false });
          }}
          className="text-[10px] font-bold text-zinc-500 hover:text-red-500 transition-colors uppercase tracking-widest"
        >
          Reset
        </button>
      </div>

      {categories && categories.length > 0 && (
        <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Categories</h3>
          <div className="space-y-1">
            {activeParentCategory ? (
              <>
                <button
                  onClick={() => handleCategoryClick("all")}
                  className="flex items-center gap-2 w-full text-[10px] font-bold text-zinc-400 hover:text-zinc-900 mb-3 px-1 transition-colors uppercase tracking-widest"
                >
                  &larr; All Categories
                </button>

                <button
                  onClick={() => handleCategoryClick(activeParentCategory.slug)}
                  className={`flex items-center justify-between w-full text-xs font-bold rounded-md px-2.5 py-2 transition-colors text-left ${currentCategory === activeParentCategory.slug ? "text-zinc-900 bg-zinc-50" : "text-zinc-800 hover:text-zinc-900 hover:bg-zinc-50"}`}
                >
                  <span className="truncate">{activeParentCategory.name}</span>
                  {currentCategory === activeParentCategory.slug && <Check className="w-3.5 h-3.5 text-red-500 shrink-0 ml-2" />}
                </button>

                {activeSiblingCategories && activeSiblingCategories.length > 0 && (
                  <div className="pl-4 mt-1 space-y-0.5 border-l-2 border-zinc-100 ml-4">
                    {activeSiblingCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.slug)}
                        className={`flex items-center justify-between w-full text-xs font-medium rounded-md px-3 py-2 transition-colors text-left ${currentCategory === cat.slug ? "text-zinc-900 bg-zinc-50 font-bold" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {currentCategory === cat.slug && <Check className="w-3.5 h-3.5 text-red-500 shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => handleCategoryClick("all")}
                  className={`flex items-center justify-between w-full text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors text-left ${currentCategory === "all"
                    ? "bg-zinc-100 text-zinc-900 font-semibold"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                >
                  <span>All Products</span>
                  {currentCategory === "all" && <Check className="w-3 h-3 text-red-500 shrink-0 ml-2" />}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className={`group flex items-center justify-between w-full text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors text-left ${currentCategory === cat.slug
                      ? "bg-zinc-100 text-zinc-900 font-semibold"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {currentCategory === cat.slug ? (
                      <Check className="w-3 h-3 text-red-500 shrink-0 ml-2" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Price (₹)</h3>

        <div className="space-y-4 py-2">
          {/* Dual Range Slider Container */}
          <div className="relative h-2 w-full bg-zinc-100 rounded-lg">
            {/* Highlights the range between min and max */}
            <div
              className="absolute h-2 bg-primary rounded-lg"
              style={{
                left: `${(minPrice / 200000) * 100}%`,
                right: `${100 - (maxPrice / 200000) * 100}%`
              }}
            />

            {/* Min Range Slider */}
            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={minPrice}
              onChange={(e) => {
                const value = Math.min(Number(e.target.value), maxPrice - 5000);
                setMinPrice(value);
              }}
              onMouseUp={(e) => {
                const val = Number(e.currentTarget.value);
                updateMultipleFilters({
                  min_price: val > 0 ? val.toString() : null,
                  max_price: maxPrice < 200000 ? maxPrice.toString() : null
                });
              }}
              onTouchEnd={(e) => {
                const val = Number(e.currentTarget.value);
                updateMultipleFilters({
                  min_price: val > 0 ? val.toString() : null,
                  max_price: maxPrice < 200000 ? maxPrice.toString() : null
                });
              }}
              className="absolute pointer-events-none appearance-none z-20 h-2 w-full bg-transparent outline-none left-0 top-0 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-950 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-950 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
            />

            {/* Max Range Slider */}
            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={maxPrice}
              onChange={(e) => {
                const value = Math.max(Number(e.target.value), minPrice + 5000);
                setMaxPrice(value);
              }}
              onMouseUp={(e) => {
                const val = Number(e.currentTarget.value);
                updateMultipleFilters({
                  min_price: minPrice > 0 ? minPrice.toString() : null,
                  max_price: val < 200000 ? val.toString() : null
                });
              }}
              onTouchEnd={(e) => {
                const val = Number(e.currentTarget.value);
                updateMultipleFilters({
                  min_price: minPrice > 0 ? minPrice.toString() : null,
                  max_price: val < 200000 ? val.toString() : null
                });
              }}
              className="absolute pointer-events-none appearance-none z-20 h-2 w-full bg-transparent outline-none left-0 top-0 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-950 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-950 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
            />
          </div>

          {/* Price Label display */}
          <div className="flex justify-between items-center text-xs font-bold text-zinc-700">
            <span>₹{minPrice.toLocaleString('en-IN')}</span>
            <span>₹{maxPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-zinc-100">
          {[
            { label: "< ₹1,000", min: null, max: 1000 },
            { label: "₹1K – ₹5K", min: 1000, max: 5000 },
            { label: "₹5K – ₹15K", min: 5000, max: 15000 },
            { label: "₹15,000+", min: 15000, max: null },
          ].map((preset, idx) => {
            const isActive = urlMinPrice === (preset.min?.toString() || null) && urlMaxPrice === (preset.max?.toString() || null);
            return (
              <button
                type="button"
                key={idx}
                onClick={() => setPricePreset(preset.min, preset.max)}
                className={cn(
                  "text-[10px] font-semibold py-1.5 px-2 text-center rounded-md border transition-all truncate",
                  isActive
                    ? "bg-zinc-950 text-white border-zinc-950 font-bold"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {brands.length > 0 && (
        <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Brands</h3>
          <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
            {brands.map((brand) => {
              const isSelected = selectedBrands.includes(brand.name);
              return (
                <label key={brand.id} className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const newBrands = e.target.checked
                        ? [...selectedBrands, brand.name]
                        : selectedBrands.filter(b => b !== brand.name);
                      updateFilters("brand", newBrands.length > 0 ? newBrands.join(",") : null);
                    }}
                    className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
                  />
                  <span className={cn(
                    "text-xs font-medium transition-colors truncate pr-2",
                    isSelected ? "text-zinc-950 font-bold" : "text-zinc-650 group-hover:text-zinc-950"
                  )}>
                    {brand.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {attributes && attributes.length > 0 && attributes.map((attr) => {
        const selectedValues = searchParams.get("attr_" + attr.id)?.split(",").map((v: string) => v.trim()).filter(Boolean) || [];
        return (
          <div key={attr.id} className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{attr.name}</h3>
            <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
              {attr.options && attr.options.map((option: string) => {
                const isSelected = selectedValues.includes(option);
                return (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const newValues = e.target.checked
                          ? [...selectedValues, option]
                          : selectedValues.filter(v => v !== option);
                        updateFilters("attr_" + attr.id, newValues.length > 0 ? newValues.join(",") : null);
                      }}
                      className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
                    />
                    <span className={cn(
                      "text-xs font-medium transition-colors",
                      isSelected ? "text-zinc-950 font-bold" : "text-zinc-650 group-hover:text-zinc-950"
                    )}>
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Rating ─────────────────────── */}
      <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Avg Rating</h4>
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const isSelected = selectedRating === stars;
            return (
              <button
                key={stars}
                onClick={() => updateFilters("rating", isSelected ? null : stars.toString())}
                className={cn(
                  "flex items-center gap-2.5 w-full text-xs rounded-lg px-2.5 py-1.5 transition-all text-left",
                  isSelected ? "bg-zinc-100 font-bold text-zinc-900" : "hover:bg-zinc-50 text-zinc-600"
                )}
              >
                {renderStars(stars)}
                <span className="text-[10px] font-semibold text-zinc-400">
                  {stars === 5 ? "Only" : "& Up"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Availability</h3>
        <div className="space-y-2.5">
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                updateMultipleFilters({
                  in_stock: e.target.checked ? "true" : "false",
                  out_of_stock: "false" // mutual exclusion
                });
              }}
              className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
            />
            <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">In Stock Only</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={outOfStockOnly}
              onChange={(e) => {
                updateMultipleFilters({
                  out_of_stock: e.target.checked ? "true" : "false",
                  in_stock: "false" // mutual exclusion
                });
              }}
              className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
            />
            <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">Out of Stock</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group select-none pt-2 border-t border-zinc-100">
            <input
              type="checkbox"
              checked={promoOnly}
              onChange={(e) => updateFilters("promo", e.target.checked ? "true" : "false")}
              className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
            />
            <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">Promotional Offers</span>
          </label>
        </div>
      </div>
    </>
  );
}
