"use client";

import { useEffect, useState, useRef } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { getCartRecommendations } from "@/app/actions/recommendationEngine";
import { useQuery } from "@tanstack/react-query";

interface Props {
  cartItemIds: string[];
  maxItems?: number;
}

export default function CartRecommendations({ cartItemIds, maxItems = 8 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["cart-recommendations", cartItemIds],
    queryFn: async () => {
      return await getCartRecommendations(cartItemIds, maxItems);
    },
    staleTime: 5 * 60 * 1000,
  });

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

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const { clientWidth, scrollLeft } = scrollRef.current;
    scrollRef.current.scrollTo({
      left: dir === "left" ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <section className="py-10 border-t border-zinc-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">
              Complete Your Order
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
    <section className="py-10 border-t border-zinc-100 mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">
              Complete Your Order
            </p>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">
              You Might Also Like
            </h2>
          </div>
        </div>

        {showArrows && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel */}
      <div className="relative">
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

        <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-white to-transparent z-10" />
      </div>
    </section>
  );
}
