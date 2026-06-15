"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileFilterWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const prevSearchParamsRef = useRef(searchParams.toString());

  useEffect(() => { setMounted(true); }, []);

  // Open via event from MobileFilterToggle
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-mobile-filter", handleOpen);
    // Also listen for close requests from within filters
    const handleClose = () => setIsOpen(false);
    window.addEventListener("close-mobile-filter", handleClose);
    return () => {
      window.removeEventListener("open-mobile-filter", handleOpen);
      window.removeEventListener("close-mobile-filter", handleClose);
    };
  }, []);

  // Close when URL search params actually change (filter was applied)
  useEffect(() => {
    const current = searchParams.toString();
    if (current !== prevSearchParamsRef.current) {
      prevSearchParamsRef.current = current;
      setIsOpen(false);
    }
  }, [searchParams]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Count active filters for badge
  const activeFilterCount = (() => {
    let count = 0;
    searchParams.forEach((val, key) => {
      if (["page", "sort"].includes(key)) return;
      if (val && val !== "false") count++;
    });
    return count;
  })();

  return (
    <>
      {/* ── Desktop sidebar (always visible) ─────────── */}
      <aside className="hidden lg:flex flex-col gap-6 lg:sticky lg:top-6">
        {children}
      </aside>

      {/* ── Mobile drawer ─────────────────────────────── */}
      {mounted && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300",
              isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in panel from left */}
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex flex-col w-[300px] max-w-[88vw] bg-white shadow-2xl transition-transform duration-300 ease-in-out",
              isOpen ? "translate-x-0" : "-translate-x-full"
            )}
            aria-modal="true"
            role="dialog"
            aria-label="Product Filters"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">
                  Filters
                </h2>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
              {children}
            </div>

            {/* Footer actions */}
            <div className="shrink-0 px-5 py-4 border-t border-zinc-100 bg-white flex items-center gap-3">
              <button
                onClick={() => {
                  // Clear all filters
                  window.dispatchEvent(new CustomEvent("reset-mobile-filters"));
                  setIsOpen(false);
                }}
                className="flex-1 h-11 text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-[2] h-11 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                {activeFilterCount > 0
                  ? `Show Results (${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} applied)`
                  : "Show Results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
