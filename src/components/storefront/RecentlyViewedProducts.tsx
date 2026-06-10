"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getRecentlyViewed,
  clearRecentlyViewed,
  type RecentlyViewedItem,
} from "@/lib/recentlyViewed";
import ProductCard from "./ProductCard";

interface Props {
  /** Exclude a product ID (e.g., the currently-viewed product). */
  excludeId?: string;
  /** Maximum items to show. Defaults to 8. */
  maxItems?: number;
  /** Compact mode — smaller cards, less vertical space. */
  compact?: boolean;
}

export default function RecentlyViewedProducts({
  excludeId,
  maxItems = 8,
  compact = false,
}: Props) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = () => {
    const all = getRecentlyViewed();
    const filtered = excludeId ? all.filter((p) => p.id !== excludeId) : all;
    setItems(filtered.slice(0, maxItems));
  };

  useEffect(() => {
    load();
    window.addEventListener("recently-viewed-updated", load);
    return () => window.removeEventListener("recently-viewed-updated", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeId, maxItems]);

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
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section className={compact ? "py-6" : "py-10"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Your History
            </p>
            <h2
              className={`font-black tracking-tight text-zinc-950 ${
                compact ? "text-xl" : "text-2xl"
              }`}
            >
              Recently Viewed
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll buttons */}
          {showArrows && (
            <>
              <button
                onClick={() => scroll("left")}
                className="hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          {/* Clear button */}
          <button
            onClick={clearRecentlyViewed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className={`shrink-0 snap-start ${
                  compact ? "w-[150px]" : "w-[180px] sm:w-[200px]"
                }`}
              >
                <ProductCard
                  product={{
                    id: item.id,
                    name: item.name,
                    slug: item.slug,
                    price: item.price,
                    sale_price: item.sale_price,
                    image_url: item.image_url,
                    status: "Active",
                    stock_quantity: 10,
                    categories: item.category_name
                      ? { name: item.category_name, slug: "" }
                      : null,
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-6 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-6 bg-gradient-to-l from-white to-transparent z-10" />
      </div>
    </section>
  );
}
