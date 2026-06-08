"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, Clock, SortAsc, SortDesc, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { label: "Newest Arrivals", value: "latest", icon: Clock },
  { label: "Price: Low to High", value: "price_asc", icon: SortAsc },
  { label: "Price: High to Low", value: "price_desc", icon: SortDesc },
  { label: "Top Rated", value: "rating", icon: Star },
];

export default function MobileFloatingActionBar() {
  const [show, setShow] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const currentSort = searchParams.get("sort") || "latest";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();

    // Close sort menu on scroll
    const closeMenu = () => setShowSortMenu(false);
    window.addEventListener("scroll", closeMenu, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", closeMenu);
    };
  }, []);

  const handleSortChange = (sortValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sortValue);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
    setShowSortMenu(false);
  };

  return (
    <div 
      className={cn(
        "md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-zinc-900/95 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-zinc-700/50 transition-all duration-300",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
    >
      {/* Floating Sort Menu Popover */}
      {showSortMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowSortMenu(false)}
          />
          <div className="absolute bottom-full mb-3 right-0 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden p-1.5 z-50 animate-in slide-in-from-bottom-2 fade-in">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                  currentSort === option.value
                    ? "bg-primary/20 text-primary"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <option.icon className="w-3.5 h-3.5" />
                  {option.label}
                </div>
                {currentSort === option.value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-filter"))}
        className="flex items-center gap-2 px-5 py-2.5 text-white hover:bg-zinc-800 rounded-full transition-colors text-[10px] font-bold uppercase tracking-widest"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
        Filters
      </button>
      <div className="w-px h-5 bg-zinc-700 mx-1"></div>
      <button
        onClick={() => setShowSortMenu(!showSortMenu)}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 text-white hover:bg-zinc-800 rounded-full transition-colors text-[10px] font-bold uppercase tracking-widest",
          showSortMenu && "bg-zinc-800"
        )}
      >
        Sort
      </button>
    </div>
  );
}
