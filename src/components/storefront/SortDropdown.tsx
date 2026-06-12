"use client";

import { useState } from "react";
import { ChevronDown, SortAsc, SortDesc, Clock, Star } from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
 
const SORT_OPTIONS = [
  { label: "Newest Arrivals", value: "latest", icon: Clock },
  { label: "Price: Low to High", value: "price_asc", icon: SortAsc },
  { label: "Price: High to Low", value: "price_desc", icon: SortDesc },
  { label: "Top Rated", value: "rating", icon: Star },
];
 
export default function SortDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentSort = searchParams.get("sort") || "latest";
  
  const activeOption = SORT_OPTIONS.find(opt => opt.value === currentSort) || SORT_OPTIONS[0];
 
  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group inline-flex items-center justify-between gap-3 h-9 px-4 bg-white border border-orange-100 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:border-primary"
        >
          <span className="flex items-center gap-2">
            <activeOption.icon className="w-3.5 h-3.5 text-primary" />
            Sort: {activeOption.label}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
 
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 z-30 mt-2 w-56 origin-top-right bg-white border border-orange-100 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {SORT_OPTIONS.map((option) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("sort", option.value);
                params.set("page", "1");
                const href = `${pathname}?${params.toString()}`;
                return (
                  <Link
                    key={option.value}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      currentSort === option.value 
                        ? "bg-orange-50 text-primary" 
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                    }`}
                  >
                    <option.icon className={`w-3.5 h-3.5 ${currentSort === option.value ? "text-primary" : "text-zinc-400"}`} />
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
