"use client";

import { SlidersHorizontal } from "lucide-react";

export default function MobileFilterToggle() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-filter"))}
      className="lg:hidden h-9 px-3 bg-white border border-zinc-200 text-xs font-medium text-zinc-700 rounded-lg shadow-xs flex items-center gap-2 hover:bg-zinc-50 transition-colors"
    >
      <SlidersHorizontal className="w-3.5 h-3.5" />
      Filters
    </button>
  );
}
