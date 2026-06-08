"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileFloatingActionBar() {
  const [show, setShow] = useState(false);

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

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div 
      className={cn(
        "md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-zinc-900/95 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-zinc-700/50 transition-all duration-300",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
    >
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-filter"))}
        className="flex items-center gap-2 px-5 py-2.5 text-white hover:bg-zinc-800 rounded-full transition-colors text-[10px] font-bold uppercase tracking-widest"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
        Filters
      </button>
      <div className="w-px h-5 bg-zinc-700 mx-1"></div>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex items-center gap-2 px-5 py-2.5 text-white hover:bg-zinc-800 rounded-full transition-colors text-[10px] font-bold uppercase tracking-widest"
      >
        Sort
      </button>
    </div>
  );
}
