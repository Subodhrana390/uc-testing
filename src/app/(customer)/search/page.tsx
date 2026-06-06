"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  Search,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  PackageX,
  Star,
  Check,
  X,
} from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import Pagination from "@/components/storefront/Pagination";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL-driven filters — handled by DB query
  const query = searchParams.get("q") || "";
  const mainFilter = searchParams.get("main") || "";
  const subFilter = searchParams.get("sub") || "";

  // DB state
  const [products, setProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [urlMainCat, setUrlMainCat] = useState<any | null>(null); // The resolved main category object from URL
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Sidebar-only drill-down state (independent of URL params)
  // These apply an extra client-side filter ON TOP of what DB already returned
  const [sidebarMainSlug, setSidebarMainSlug] = useState<string | null>(null);
  const [sidebarSubSlug, setSidebarSubSlug] = useState<string | null>(null);

  // Other client-side filters
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);
  const [inStockFilter, setInStockFilter] = useState(false);
  const [outOfStockFilter, setOutOfStockFilter] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch full categories list once for sidebar hierarchy
  useEffect(() => {
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) setAllCategories(data);
    });
  }, [supabase]);

  // DB fetch — runs when URL params change
  useEffect(() => {
    // Reset sidebar + client filters on every new URL-based search
    setSidebarMainSlug(null);
    setSidebarSubSlug(null);
    setSelectedBrand(null);
    setSelectedRating(null);
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedMinPrice(null);
    setAppliedMaxPrice(null);
    setInStockFilter(false);
    setOutOfStockFilter(false);
    setCurrentPage(1);

    async function fetchProducts() {
      setLoading(true);
      try {
        let categoryIds: string[] = [];
        let resolvedMainCat: any = null;

        if (subFilter) {
          // sub filter: fetch only that sub category's products
          const { data: subCat } = await supabase
            .from("categories")
            .select("id, name, parent_id")
            .eq("slug", subFilter)
            .single();
          if (subCat) {
            categoryIds.push(subCat.id);
            // also resolve its parent for breadcrumb
            if (subCat.parent_id) {
              const { data: parent } = await supabase
                .from("categories")
                .select("*")
                .eq("id", subCat.parent_id)
                .single();
              resolvedMainCat = parent || null;
            }
          }
        } else if (mainFilter) {
          // main filter: fetch main category + ALL its subcategories
          const { data: mainCat } = await supabase
            .from("categories")
            .select("*")
            .eq("slug", mainFilter)
            .single();
          if (mainCat) {
            resolvedMainCat = mainCat;
            categoryIds.push(mainCat.id);
            const { data: subCats } = await supabase
              .from("categories")
              .select("id")
              .eq("parent_id", mainCat.id);
            if (subCats) {
              categoryIds.push(...subCats.map((s: any) => s.id));
            }
          }
        }

        setUrlMainCat(resolvedMainCat);

        let dbQuery = supabase
          .from("products")
          .select(
            "*, categories(id, name, slug, parent_id), brands(id, name), product_reviews(rating)"
          )
          .eq("status", "Active");

        if (query) {
          dbQuery = dbQuery.or(
            `name.ilike.%${query}%,description.ilike.%${query}%`
          );
        }

        if (categoryIds.length > 0) {
          dbQuery = dbQuery.in("category_id", categoryIds);
        }

        const { data, error } = await dbQuery.limit(300);
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Search query error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [query, mainFilter, subFilter, supabase]);

  // ─── Sidebar hierarchy derived from allCategories ─────────────────────────
  // If URL provides a mainFilter, we pre-highlight it. Sidebar clicks override.
  const activeSidebarMainCat = useMemo(() => {
    const slug = sidebarMainSlug || mainFilter || null;
    if (!slug) return null;
    return allCategories.find((c) => c.slug === slug) || null;
  }, [sidebarMainSlug, mainFilter, allCategories]);

  const sidebarTopLevelCats = useMemo(
    () => allCategories.filter((c) => !c.parent_id),
    [allCategories]
  );

  const sidebarSubcategories = useMemo(() => {
    if (!activeSidebarMainCat) return [];
    return allCategories.filter(
      (c) => c.parent_id === activeSidebarMainCat.id
    );
  }, [activeSidebarMainCat, allCategories]);

  // ─── Available brands extracted from DB results ───────────────────────────
  const availableBrands = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    products.forEach((p) => {
      const brandName = p.brands?.name;
      if (brandName) {
        counts[brandName] = {
          name: brandName,
          count: (counts[brandName]?.count || 0) + 1,
        };
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [products]);

  // ─── Filtered + Sorted products (client-side) ─────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Sidebar sub-category drill-down: filter by sub category within the already-fetched set
    if (sidebarSubSlug) {
      result = result.filter(
        (p) => p.categories?.slug === sidebarSubSlug
      );
    } else if (sidebarMainSlug && !mainFilter) {
      // Only apply client-side main-cat filter when navigating by sidebar 
      // (not when URL already pre-filtered the DB query)
      result = result.filter((p) => {
        const cat = p.categories;
        if (!cat) return false;
        if (cat.slug === sidebarMainSlug) return true;
        const parent = allCategories.find((c) => c.id === cat.parent_id);
        return parent?.slug === sidebarMainSlug;
      });
    }

    // Brand
    if (selectedBrand) {
      result = result.filter((p) => p.brands?.name === selectedBrand);
    }

    // Minimum rating
    if (selectedRating !== null) {
      result = result.filter((p) => {
        const reviews = p.product_reviews || [];
        const avg =
          reviews.length > 0
            ? reviews.reduce(
                (acc: number, r: any) => acc + r.rating,
                0
              ) / reviews.length
            : 0;
        return avg >= selectedRating;
      });
    }

    // Price range
    if (appliedMinPrice !== null) {
      result = result.filter(
        (p) => Number(p.sale_price || p.price) >= appliedMinPrice
      );
    }
    if (appliedMaxPrice !== null) {
      result = result.filter(
        (p) => Number(p.sale_price || p.price) <= appliedMaxPrice
      );
    }

    // Stock
    if (inStockFilter && !outOfStockFilter) {
      result = result.filter((p) => p.stock_quantity > 0);
    } else if (outOfStockFilter && !inStockFilter) {
      result = result.filter((p) => p.stock_quantity === 0);
    }

    // Sorting
    if (sortBy === "price_asc") {
      result.sort(
        (a, b) =>
          Number(a.sale_price || a.price) - Number(b.sale_price || b.price)
      );
    } else if (sortBy === "price_desc") {
      result.sort(
        (a, b) =>
          Number(b.sale_price || b.price) - Number(a.sale_price || a.price)
      );
    } else if (sortBy === "rating") {
      result.sort((a, b) => {
        const aR = a.product_reviews || [];
        const bR = b.product_reviews || [];
        const aAvg =
          aR.length > 0
            ? aR.reduce((s: number, r: any) => s + r.rating, 0) / aR.length
            : 0;
        const bAvg =
          bR.length > 0
            ? bR.reduce((s: number, r: any) => s + r.rating, 0) / bR.length
            : 0;
        if (bAvg !== aAvg) return bAvg - aAvg;
        return (b.is_top_rated ? 1 : 0) - (a.is_top_rated ? 1 : 0);
      });
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    }

    return result;
  }, [
    products,
    sidebarMainSlug,
    sidebarSubSlug,
    mainFilter,
    selectedBrand,
    selectedRating,
    appliedMinPrice,
    appliedMaxPrice,
    inStockFilter,
    outOfStockFilter,
    sortBy,
    allCategories,
  ]);

  // ─── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredProducts.slice(from, from + pageSize);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Keep URL in sync so refresh / share / Vercel production all work correctly
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (mainFilter) params.set("main", mainFilter);
    if (subFilter) params.set("sub", subFilter);
    if (page > 1) params.set("page", page.toString());
    const newUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.replace(newUrl, { scroll: false });
  };

  // ─── Active filter helpers ────────────────────────────────────────────────
  const hasActiveFilters =
    sidebarMainSlug !== null ||
    sidebarSubSlug !== null ||
    selectedBrand !== null ||
    selectedRating !== null ||
    appliedMinPrice !== null ||
    appliedMaxPrice !== null ||
    inStockFilter ||
    outOfStockFilter;

  const clearAllFilters = () => {
    setSidebarMainSlug(null);
    setSidebarSubSlug(null);
    setSelectedBrand(null);
    setSelectedRating(null);
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedMinPrice(null);
    setAppliedMaxPrice(null);
    setInStockFilter(false);
    setOutOfStockFilter(false);
    setCurrentPage(1);
    if (mainFilter || subFilter) router.push("/search" + (query ? `?q=${query}` : ""));
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedMinPrice(minPriceInput ? Number(minPriceInput) : null);
    setAppliedMaxPrice(maxPriceInput ? Number(maxPriceInput) : null);
    setCurrentPage(1);
  };

  const setPricePreset = (min: number | null, max: number | null) => {
    setMinPriceInput(min !== null ? min.toString() : "");
    setMaxPriceInput(max !== null ? max.toString() : "");
    setAppliedMinPrice(min);
    setAppliedMaxPrice(max);
    setCurrentPage(1);
  };

  // ─── Derived display values ───────────────────────────────────────────────
  const resolvedSubCat = useMemo(() => {
    const slug = sidebarSubSlug || subFilter || null;
    if (!slug) return null;
    return allCategories.find((c) => c.slug === slug) || null;
  }, [sidebarSubSlug, subFilter, allCategories]);

  const pageTitle = query
    ? `Results for "${query}"`
    : resolvedSubCat
    ? resolvedSubCat.name
    : activeSidebarMainCat
    ? activeSidebarMainCat.name
    : "All Products";

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

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-zinc-50/50 min-h-screen text-zinc-900 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-200/80">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Search className="w-3.5 h-3.5" /> Catalog Exploration
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
              {pageTitle}
            </h1>

            {/* Breadcrumb when in a category context */}
            {activeSidebarMainCat && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <Link href="/search" className="hover:text-primary transition-colors">All Products</Link>
                <ChevronRight className="w-3 h-3" />
                <span
                  onClick={() => { setSidebarSubSlug(null); }}
                  className={cn("cursor-pointer hover:text-primary transition-colors", !resolvedSubCat && "text-zinc-800 font-semibold")}
                >
                  {activeSidebarMainCat.name}
                </span>
                {resolvedSubCat && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-zinc-800 font-semibold">{resolvedSubCat.name}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sort + count */}
          {products.length > 0 && (
            <div className="flex items-center gap-3 self-end md:self-auto">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden h-9 px-3 bg-white border border-zinc-200 text-xs font-medium text-zinc-700 rounded-lg shadow-xs flex items-center gap-2 hover:bg-zinc-50 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
              </button>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-2 rounded-lg">
                {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="h-9 pl-3 pr-8 bg-white border border-zinc-200 text-xs font-medium text-zinc-700 rounded-lg shadow-xs appearance-none outline-hidden focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 cursor-pointer transition-all"
                >
                  <option value="latest">Sort: Newest</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="rating">Top Rated</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="h-[500px] bg-white border border-zinc-200/60 rounded-xl p-6 animate-pulse" />
            <div className="lg:col-span-3 grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            {isMobileFilterOpen && (
              <div
                className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
                onClick={() => setIsMobileFilterOpen(false)}
              />
            )}
            <aside className={cn(
              "bg-white border border-zinc-200/80 p-5 shadow-xs space-y-6 transition-transform duration-300",
              "lg:block lg:sticky lg:top-24 lg:rounded-xl lg:col-span-1 lg:translate-x-0",
              isMobileFilterOpen
                ? "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[80vw] overflow-y-auto rounded-r-xl translate-x-0"
                : "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[80vw] overflow-y-auto rounded-r-xl -translate-x-full lg:relative lg:z-auto lg:w-auto lg:overflow-visible lg:rounded-xl lg:translate-x-0 hidden lg:block"
            )}>
              {/* Sidebar header */}
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 inline-flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" /> Filters
                </h3>
                <div className="flex items-center gap-3">
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs font-medium text-primary hover:text-red-600 inline-flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="lg:hidden text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Categories ─────────────────── */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Categories</h4>

                {activeSidebarMainCat ? (
                  /* Drilled into a main category: show back + subcategories */
                  <div className="space-y-2">
                    <button
                      onClick={() => { setSidebarMainSlug(mainFilter || null); setSidebarSubSlug(null); setCurrentPage(1); }}
                      className="text-xs font-bold text-zinc-400 hover:text-primary flex items-center gap-1 transition-colors"
                    >
                      ← All Categories
                    </button>

                    {/* Main cat label */}
                    <div
                      onClick={() => { setSidebarSubSlug(null); setCurrentPage(1); }}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer text-xs font-black px-2.5 py-1.5 rounded-lg border-l-2 transition-all",
                        !sidebarSubSlug
                          ? "border-primary bg-orange-50 text-zinc-900"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-350 hover:bg-zinc-50"
                      )}
                    >
                      <span className="truncate">{activeSidebarMainCat.name}</span>
                      {!sidebarSubSlug && <Check className="w-3 h-3 text-primary ml-auto shrink-0" />}
                    </div>

                    {/* Sub categories list */}
                    {sidebarSubcategories.length > 0 && (
                      <div className="pl-3 space-y-1">
                        {sidebarSubcategories.map((sub: any) => {
                          const isActive = sidebarSubSlug === sub.slug || subFilter === sub.slug;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setSidebarSubSlug(isActive ? null : sub.slug);
                                setCurrentPage(1);
                              }}
                              className={cn(
                                "flex items-center justify-between w-full text-xs py-1.5 px-2.5 rounded-md transition-all text-left",
                                isActive
                                  ? "bg-zinc-100 text-zinc-950 font-bold"
                                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 font-medium"
                              )}
                            >
                              <span>{sub.name}</span>
                              {isActive && <Check className="w-3 h-3 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Top-level: show all main categories */
                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {sidebarTopLevelCats.map((main: any) => (
                      <button
                        key={main.id}
                        onClick={() => {
                          setSidebarMainSlug(main.slug);
                          setSidebarSubSlug(null);
                          setCurrentPage(1);
                        }}
                        className="flex items-center justify-between w-full text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors text-left text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      >
                        <span>{main.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-zinc-100" />

              {/* ── Price Range ─────────────────── */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Price (₹)</h4>
                <form onSubmit={handlePriceApply} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPriceInput}
                      onChange={(e) => setMinPriceInput(e.target.value)}
                      className="w-full text-xs border border-zinc-200 rounded-lg h-9 px-2.5 outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                    <span className="text-zinc-400 text-xs font-bold">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      className="w-full text-xs border border-zinc-200 rounded-lg h-9 px-2.5 outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      type="submit"
                      className="h-9 px-3 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Go
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "< ₹1,000", min: null, max: 1000 },
                      { label: "₹1K – ₹5K", min: 1000, max: 5000 },
                      { label: "₹5K – ₹15K", min: 5000, max: 15000 },
                      { label: "₹15,000+", min: 15000, max: null },
                    ].map((preset, idx) => {
                      const isActive = appliedMinPrice === preset.min && appliedMaxPrice === preset.max;
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setPricePreset(preset.min, preset.max)}
                          className={cn(
                            "text-[10px] font-semibold py-1.5 px-2 text-center rounded-md border transition-all truncate",
                            isActive
                              ? "bg-zinc-950 text-white border-zinc-950 font-bold"
                              : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </form>
              </div>

              <hr className="border-zinc-100" />

              {/* ── Brands ─────────────────────── */}
              {availableBrands.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Brands</h4>
                    <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                      {availableBrands.map((brand) => {
                        const isSelected = selectedBrand === brand.name;
                        return (
                          <button
                            key={brand.name}
                            onClick={() => { setSelectedBrand(isSelected ? null : brand.name); setCurrentPage(1); }}
                            className={cn(
                              "flex items-center justify-between w-full text-xs font-medium rounded-md px-2 py-1.5 transition-colors text-left",
                              isSelected
                                ? "bg-zinc-100 text-zinc-950 font-bold"
                                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                            )}
                          >
                            <span className="truncate pr-2">{brand.name}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 shrink-0">
                              {brand.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <hr className="border-zinc-100" />
                </>
              )}

              {/* ── Rating ─────────────────────── */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Avg Rating</h4>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const isSelected = selectedRating === stars;
                    return (
                      <button
                        key={stars}
                        onClick={() => { setSelectedRating(isSelected ? null : stars); setCurrentPage(1); }}
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

              <hr className="border-zinc-100" />

              {/* ── Stock ──────────────────────── */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Availability</h4>
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={inStockFilter}
                    onChange={(e) => { setInStockFilter(e.target.checked); setCurrentPage(1); }}
                    className="w-4 h-4 rounded-sm border-zinc-300 accent-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">In Stock Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={outOfStockFilter}
                    onChange={(e) => { setOutOfStockFilter(e.target.checked); setCurrentPage(1); }}
                    className="w-4 h-4 rounded-sm border-zinc-300 accent-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">Out of Stock</span>
                </label>
              </div>
            </aside>

            {/* ── Products Grid ──────────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-10">
              {paginatedProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="pt-6 border-t border-zinc-200/60">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        baseUrl="/search"
                        preserveParams={{
                          q: query || undefined,
                          main: mainFilter || undefined,
                          sub: subFilter || undefined,
                        }}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="border border-zinc-200 bg-white rounded-xl py-20 px-4 text-center shadow-xs">
                  <SlidersHorizontal className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">No matching products</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-4">
                    Try widening your filter parameters.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>

        ) : (
          /* Empty state */
          <div className="border border-zinc-200 bg-white py-16 px-4 text-center rounded-xl max-w-xl mx-auto shadow-xs">
            <PackageX className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
            <h2 className="text-md font-bold text-zinc-900 mb-1">No matches found</h2>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-6">
              We couldn't locate anything for{" "}
              <span className="font-semibold text-zinc-800">"{query}"</span>.
              Double-check your spelling or browse the catalog.
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
