"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  ChevronRight,
  Search,
  LayoutGrid,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
}

interface CategorySelectorProps {
  categories: Category[];
}

export default function CategorySelector({
  categories,
}: CategorySelectorProps) {
  const router = useRouter();

  const [selectedMain, setSelectedMain] =
    useState("");

  const [selectedSub, setSelectedSub] =
    useState("");

  const mainCategories =
    categories.filter(
      (c) => !c.parent_id
    );

  const subCategories =
    categories.filter(
      (c) =>
        c.parent_id === selectedMain
    );

  useEffect(() => {
    setSelectedSub("");
  }, [selectedMain]);

  const handleSearch = () => {
    if (selectedSub) {
      const sub = categories.find(
        (c) => c.id === selectedSub
      );

      if (sub) {
        router.push(
          `/categories/${sub.slug}`
        );
      }
    } else if (selectedMain) {
      const main = categories.find(
        (c) => c.id === selectedMain
      );

      if (main) {
        router.push(
          `/categories/${main.slug}`
        );
      }
    }
  };

  return (
    <div data-nosnippet className="w-full max-w-4xl mx-auto py-6 sm:py-10">
      <div className="relative group bg-white border border-zinc-100 p-3 sm:p-6 shadow-xl shadow-red-50/20 rounded-2xl sm:rounded-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 to-transparent pointer-events-none rounded-[2rem]" />

        <div className="relative z-10 flex flex-row items-end gap-2.5 sm:gap-4 w-full">
          {/* Main Category */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1 block truncate">
              1. Department
            </label>

            <div className="relative">
              <select
                value={selectedMain}
                onChange={(e) => setSelectedMain(e.target.value)}
                className="w-full h-12 sm:h-14 pl-8 sm:pl-12 pr-6 sm:pr-4 rounded-xl border border-zinc-100 bg-white text-xs sm:text-sm font-bold text-zinc-950 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">All Departments</option>
                {mainCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 text-primary">
                <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* Sub Category */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1 block truncate">
              2. Category
            </label>

            <div className="relative">
              <select
                value={selectedSub}
                onChange={(e) => setSelectedSub(e.target.value)}
                disabled={!selectedMain}
                className={cn(
                  "w-full h-12 sm:h-14 pl-8 sm:pl-12 pr-6 sm:pr-4 rounded-xl border border-zinc-100 bg-white text-xs sm:text-sm font-bold text-zinc-950 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer",
                  !selectedMain && "opacity-50 cursor-not-allowed bg-zinc-50"
                )}
              >
                <option value="">Select Subcategory</option>
                {subCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 text-primary">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* Search Button */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={!selectedMain && !selectedSub}
            className="h-12 sm:h-14 px-4 sm:px-8 rounded-xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Find Products</span>
          </button>
        </div>
      </div>
    </div>
  );
}
