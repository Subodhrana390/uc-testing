"use client";

import { useEffect, useRef, useState, CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { FixedSizeList as List } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";

interface ProductCarouselProps {
  products: any[];
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  const listRef = useRef<List>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showArrows, setShowArrows] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const itemWidth = isMobile ? 180 : 200;
  const gap = 24; // gap-6
  const itemSize = itemWidth + gap;

  useEffect(() => {
    // Show arrows if total width is greater than container width
    const totalWidth = products.length * itemSize;
    if (typeof window !== "undefined") {
      setShowArrows(totalWidth > window.innerWidth - 64); // approx padding
    }
  }, [products, itemSize]);

  const scroll = (direction: "left" | "right") => {
    if (listRef.current) {
      const containerWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
      const amountToScroll = containerWidth * 0.8;
      const scrollTo = direction === "left"
        ? Math.max(0, scrollOffset - amountToScroll)
        : scrollOffset + amountToScroll;

      listRef.current.scrollTo(scrollTo);
      setScrollOffset(scrollTo);
    }
  };

  if (!products || products.length === 0) return null;

  const Row = ({ index, style }: { index: number; style: CSSProperties }) => {
    const product = products[index];
    return (
      <div style={{ ...style, width: itemWidth, paddingRight: gap }}>
        <div className="h-full w-full">
          <ProductCard product={product} />
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-[420px] w-full">
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

      {/* Virtualized Scroll Container */}
      <div className="h-full w-full py-4 px-1">
        <AutoSizer renderProp={({ height, width }: { height?: number; width?: number }) => {
          if (height === undefined || width === undefined) return null;
          return (
            <List
              ref={listRef}
              height={height}
              itemCount={products.length}
              itemSize={itemSize}
              layout="horizontal"
              width={width}
              className="scrollbar-hide"
              style={{ overflowY: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }}
              onScroll={({ scrollOffset }: { scrollOffset: number }) => setScrollOffset(scrollOffset)}
            >
              {Row}
            </List>
          );
        }} />
      </div>

      {/* Visual Fade indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/10 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/10 to-transparent pointer-events-none z-10" />
    </div>
  );
}
