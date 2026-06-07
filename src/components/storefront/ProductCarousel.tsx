"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

interface ProductCarouselProps {
  products: any[];
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === "left" 
        ? scrollLeft - clientWidth * 0.8 
        : scrollLeft + clientWidth * 0.8;
      
      scrollContainerRef.current.scrollTo({
        left: scrollTo,
        behavior: "smooth"
      });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="relative">
      {/* Navigation Buttons */}
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

      {/* Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => (
          <div 
            key={product.id} 
            className="w-[220px] sm:w-[260px] shrink-0 snap-start"
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
