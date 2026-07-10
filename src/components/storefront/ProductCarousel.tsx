"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

interface ProductCarouselProps {
  products: any[];
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const { clientWidth, scrollLeft } = scrollRef.current;
    scrollRef.current.scrollTo({
      left: dir === "left" ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75,
      behavior: "smooth",
    });
  };

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

  if (!products || products.length === 0) return null;

  return (
    <div className="relative w-full">
      {/* Navigation Buttons */}
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

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="shrink-0 snap-start w-[180px] sm:w-[200px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Visual Fade indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/10 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/10 to-transparent pointer-events-none z-10" />
    </div>
  );
}
