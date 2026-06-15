"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getRecentlyViewedCategories, getRecentlyViewedIds } from "@/lib/recentlyViewed";
import ProductCard from "./ProductCard";

interface Props {
  /** ID of the current product to exclude. */
  excludeId?: string;
  /** Optional current category to boost relevance. */
  categoryId?: string | null;
  maxItems?: number;
}

/**
 * Smart recommendation carousel.
 *
 * Priority order:
 * 1. Products from categories the user has recently browsed (category affinity).
 * 2. Products from the current product's category (contextual).
 * 3. Automatic best-seller fallback (popular products ranked by actual sales).
 *
 * Excludes already-viewed & current product.
 */
export default function RecommendedProducts({
  excludeId,
  categoryId,
  maxItems = 8,
}: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const { clientWidth, scrollLeft } = scrollRef.current;
    scrollRef.current.scrollTo({
      left: dir === "left" ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75,
      behavior: "smooth",
    });
  };

  const [showArrows, setShowArrows] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      if (scrollRef.current) {
        setShowArrows(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };
    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, [products]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations() {
      setLoading(true);
      const supabase = createClient();

      // Build exclude set: current product + recently viewed ids
      const viewedIds = getRecentlyViewedIds();
      const excludeIds = [
        ...(excludeId ? [excludeId] : []),
        ...viewedIds,
      ].filter(Boolean);

      // Get categories from browsing history for affinity scoring
      const affinityCategories = getRecentlyViewedCategories();

      let results: any[] = [];

      // ── STEP 1: Category-affinity products ──────────────────────────────────
      if (affinityCategories.length > 0) {
        // Find category IDs by name
        const { data: catData } = await supabase
          .from("categories")
          .select("id")
          .in("name", affinityCategories.slice(0, 5));

        const catIds = (catData || []).map((c) => c.id);

        if (catIds.length > 0) {
          const query = supabase
            .from("products")
            .select(
              "*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)"
            )
            .in("category_id", catIds)
            .eq("status", "Active")
            .order("created_at", { ascending: false })
            .limit(maxItems + excludeIds.length);

          const { data } = await query;

          if (data) {
            results = data.filter(
              (p) => !excludeIds.includes(p.id)
            );
          }
        }
      }

      // ── STEP 2: Current category products (contextual) ──────────────────────
      if (results.length < maxItems && categoryId) {
        const alreadyIds = [
          ...excludeIds,
          ...results.map((p) => p.id),
        ];

        const { data: catProducts } = await supabase
          .from("products")
          .select(
            "*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)"
          )
          .eq("category_id", categoryId)
          .eq("status", "Active")
          .not("id", "in", `(${alreadyIds.join(",")})`)
          .limit(maxItems - results.length);

        if (catProducts) {
          results = [...results, ...catProducts];
        }
      }

      // ── STEP 3: Popular fallback — automatic top-selling products ───────────
      if (results.length < maxItems) {
        const alreadyIds = [
          ...excludeIds,
          ...results.map((p) => p.id),
        ];

        const notInClause = alreadyIds.length > 0
          ? `(${alreadyIds.join(",")})`
          : `('')`; // safe empty

        const { data: popular } = await supabase
          .from("top_selling_products")
          .select(
            "*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)"
          )
          .eq("status", "Active")
          .not("id", "in", notInClause)
          .limit(maxItems - results.length);

        if (popular) {
          results = [...results, ...popular];
        }
      }

      // ── Final fallback: latest active products ──────────────────────────────
      if (results.length < maxItems) {
        const alreadyIds = [
          ...excludeIds,
          ...results.map((p) => p.id),
        ];
        const notInClause = alreadyIds.length > 0
          ? `(${alreadyIds.join(",")})`
          : `('')`;

        const { data: latest } = await supabase
          .from("products")
          .select(
            "*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)"
          )
          .eq("status", "Active")
          .not("id", "in", notInClause)
          .order("created_at", { ascending: false })
          .limit(maxItems - results.length);

        if (latest) {
          results = [...results, ...latest];
        }
      }

      if (!cancelled) {
        setProducts(results.slice(0, maxItems));
        setLoading(false);
      }
    }

    fetchRecommendations();

    // Re-fetch when browsing history changes
    window.addEventListener("recently-viewed-updated", fetchRecommendations);
    return () => {
      cancelled = true;
      window.removeEventListener("recently-viewed-updated", fetchRecommendations);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeId, categoryId, maxItems]);

  if (loading) {
    return (
      <section className="py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-500">
              Personalised For You
            </p>
            <div className="h-6 w-44 bg-zinc-100 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-[180px] sm:w-[200px] shrink-0 rounded-2xl bg-zinc-100 animate-pulse"
              style={{ height: 280, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-500">
              Personalised For You
            </p>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">
              Recommended
            </h2>
          </div>
        </div>
      </div>

      {/* Pill chips — show which categories are being recommended */}
      {getRecentlyViewedCategories().length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {getRecentlyViewedCategories()
            .slice(0, 4)
            .map((cat) => (
              <span
                key={cat}
                className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100"
              >
                {cat}
              </span>
            ))}
        </div>
      )}

      {/* Carousel */}
      <div className="relative">
        {/* Floating Navigation Arrows */}
        {showArrows && (
          <>
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 bg-zinc-950 text-white shadow-2xl rounded-full flex items-center justify-center transition-all opacity-40 hover:opacity-100 hover:scale-110 hidden md:flex"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 bg-zinc-950 text-white shadow-2xl rounded-full flex items-center justify-center transition-all opacity-40 hover:opacity-100 hover:scale-110 hidden md:flex"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[180px] sm:w-[200px] shrink-0 snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-white/10 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-white/10 to-transparent z-10" />
      </div>
    </section>
  );
}
