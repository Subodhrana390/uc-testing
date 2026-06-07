"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function ProductSidebarFilters({ categories }: { categories: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentCategory = searchParams.get("category") || "all";
  const inStockOnly = searchParams.get("in_stock") === "true";
  const promoOnly = searchParams.get("promo") === "true";

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all" || value === "false") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // Reset page to 1 when filters change
    router.push(`/products?${params.toString()}`);
  };

  return (
    <>
      <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Categories</h3>
        <div className="space-y-1">
          <button
            onClick={() => updateFilters("category", "all")}
            className={`flex items-center justify-between w-full text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors text-left ${currentCategory === "all"
              ? "bg-zinc-100 text-zinc-900 font-semibold"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
          >
            <span>All Products</span>
            {currentCategory === "all" && <ArrowRight className="w-3 h-3 text-zinc-900" />}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateFilters("category", cat.slug)}
              className={`group flex items-center justify-between w-full text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors text-left ${currentCategory === cat.slug
                ? "bg-zinc-100 text-zinc-900 font-semibold"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
            >
              <span>{cat.name}</span>
              <ArrowRight className={`w-3 h-3 transition-opacity ${currentCategory === cat.slug ? "text-zinc-900 opacity-100" : "text-zinc-400 opacity-0 group-hover:opacity-100"}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Availability</h3>
        <div className="space-y-2.5">
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => updateFilters("in_stock", e.target.checked ? "true" : "false")}
              className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
            />
            <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">In Stock Only</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group select-none">
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
