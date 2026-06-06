"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Search, ChevronDown, SlidersHorizontal, RotateCcw, PackageX } from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const mainFilter = searchParams.get("main") || "";
  const subFilter = searchParams.get("sub") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Filter & sorting states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState("latest");

  useEffect(() => {
    setSelectedCategory(null);
    async function searchProducts() {
      setLoading(true);
      if (!query && !mainFilter && !subFilter) {
        setProducts([]);
        setCategoryName("");
        setLoading(false);
        return;
      }

      try {
        let categoryIds: string[] = [];
        let fetchedCategoryName = "";

        if (subFilter) {
          const { data: subCat } = await supabase
            .from("categories")
            .select("id, name")
            .eq("slug", subFilter)
            .single();
          if (subCat) {
            categoryIds.push(subCat.id);
            fetchedCategoryName = subCat.name;
          }
        } else if (mainFilter) {
          const { data: mainCat } = await supabase
            .from("categories")
            .select("id, name")
            .eq("slug", mainFilter)
            .single();
          if (mainCat) {
            categoryIds.push(mainCat.id);
            fetchedCategoryName = mainCat.name;

            const { data: subCats } = await supabase
              .from("categories")
              .select("id")
              .eq("parent_id", mainCat.id);
            if (subCats) {
              categoryIds.push(...subCats.map((s) => s.id));
            }
          }
        }

        setCategoryName(fetchedCategoryName);

        let dbQuery = supabase
          .from("products")
          .select("*, categories(name, slug), product_reviews(rating)")
          .eq("status", "Active");

        if (query) {
          dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
        }

        if (categoryIds.length > 0) {
          dbQuery = dbQuery.in("category_id", categoryIds);
        }

        const { data, error } = await dbQuery.limit(50);
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Search query error:", err);
      } finally {
        setLoading(false);
      }
    }

    searchProducts();
  }, [query, mainFilter, subFilter, supabase]);

  // Client-side filtering & sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory) {
      result = result.filter((p) => p.categories?.name === selectedCategory);
    }
    if (inStockOnly) {
      result = result.filter((p) => p.stock_quantity > 0);
    }
    if (onSaleOnly) {
      result = result.filter((p) => p.sale_price !== null && p.sale_price > 0);
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
    } else if (sortBy === "rating") {
      result.sort((a, b) => {
        const aReviews = a.product_reviews || [];
        const bReviews = b.product_reviews || [];
        const aAvg = aReviews.length > 0 ? aReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / aReviews.length : 0;
        const bAvg = bReviews.length > 0 ? bReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / bReviews.length : 0;

        if (bAvg !== aAvg) return bAvg - aAvg;

        const aTop = a.is_top_rated ? 1 : 0;
        const bTop = b.is_top_rated ? 1 : 0;
        return bTop - aTop;
      });
    } else {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return result;
  }, [products, selectedCategory, inStockOnly, onSaleOnly, sortBy]);

  // Extract unique categories and counts from results
  const availableCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const name = p.categories?.name;
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [products]);

  const hasActiveFilters = selectedCategory || inStockOnly || onSaleOnly;

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setInStockOnly(false);
    setOnSaleOnly(false);
  };

  return (
    <div className="bg-zinc-50/50 min-h-screen text-zinc-900 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header Title Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-200/80">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Search className="w-3.5 h-3.5" /> Catalog Exploration
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
              {query
                ? `Search results for "${query}"`
                : categoryName
                  ? categoryName
                  : "All Products"}
            </h1>
            {categoryName && query && (
              <p className="text-sm text-zinc-500">Filtered within department: <span className="font-medium text-zinc-800">{categoryName}</span></p>
            )}
          </div>

          {products.length > 0 && (
            <div className="flex items-center gap-3 self-end md:self-auto">
              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-2 rounded-lg">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </span>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-9 pl-3 pr-8 bg-white border border-zinc-200 text-xs font-medium text-zinc-700 rounded-lg shadow-xs appearance-none outline-hidden focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 cursor-pointer transition-all"
                >
                  <option value="latest">Sort: Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Sort: Top Rated</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          /* Premium Skeleton / Pulse Loading state */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-4 h-64 bg-white border border-zinc-200/60 rounded-xl p-6 animate-pulse" />
            <div className="lg:col-span-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-3/4 bg-white border border-zinc-200/60 rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="w-full h-48 bg-zinc-100 rounded-lg" />
                  <div className="h-4 bg-zinc-100 rounded-md w-2/3" />
                  <div className="h-4 bg-zinc-100 rounded-md w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

            {/* Elegant Filters Sidebar */}
            <aside className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-xs space-y-6 lg:sticky lg:top-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 inline-flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" /> Filter Framework
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-medium text-primary hover:text-red-600 inline-flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-900">Departments</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 subtle-scrollbar">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "flex items-center justify-between w-full text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors text-left",
                      !selectedCategory
                        ? "bg-zinc-100 text-zinc-900 font-semibold"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    )}
                  >
                    <span>All Departments</span>
                    <span className="text-[11px] text-zinc-400 font-normal">({products.length})</span>
                  </button>
                  {availableCategories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={cn(
                        "flex items-center justify-between w-full text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors text-left",
                        selectedCategory === cat.name
                          ? "bg-zinc-100 text-zinc-900 font-semibold"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      )}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span className="text-[11px] text-zinc-400 font-normal">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-zinc-100" />

              {/* Availability Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-900">Status</h4>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
                    />
                    <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">In Stock Only</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={onSaleOnly}
                      onChange={(e) => setOnSaleOnly(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 transition-all cursor-pointer"
                    />
                    <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">Promotional Offers</span>
                  </label>
                </div>
              </div>
            </aside>

            {/* Products Grid Column */}
            <div className="lg:col-span-3">
              {filteredProducts.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                /* Filter Empty State */
                <div className="border border-zinc-200 bg-white rounded-xl py-20 px-4 text-center shadow-xs">
                  <SlidersHorizontal className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">No matching products</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-4">
                    Try adjusting or widening your status parameters to discover items.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
                  >
                    Clear Active Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Absolute Empty State */
          <div className="border border-zinc-200 bg-white py-16 px-4 text-center rounded-xl max-w-xl mx-auto shadow-xs">
            <PackageX className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
            <h2 className="text-md font-bold text-zinc-900 mb-1">No matches found</h2>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-6">
              We couldn't locate anything for <span className="font-semibold text-zinc-800">"{query}"</span>. Double-check your spelling or look over alternative catalogs.
            </p>
            <Link
              href="/products"
              className="inline-flex h-9 items-center justify-center px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              Browse Complete Catalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}