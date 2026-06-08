"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileFilterWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-mobile-filter", handleOpen);
    return () => window.removeEventListener("open-mobile-filter", handleOpen);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          "transition-transform duration-300",
          "lg:block lg:translate-x-0",
          isOpen
            ? "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[80vw] overflow-y-auto rounded-r-xl bg-zinc-50 p-5 translate-x-0"
            : "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[80vw] overflow-y-auto rounded-r-xl bg-zinc-50 p-5 -translate-x-full lg:relative lg:z-auto lg:w-auto lg:overflow-visible lg:rounded-xl lg:bg-transparent lg:p-0 lg:translate-x-0 hidden lg:block"
        )}
      >
        <div className="flex justify-between items-center lg:hidden pb-4 mb-4 border-b border-zinc-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 inline-flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" /> Filters
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}
      </div>
    </>
  );
}
