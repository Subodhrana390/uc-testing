"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  variantColor?: "orange" | "blue" | "sky" | "teal" | "amber" | "emerald" | "indigo" | "pink" | "purple" | "yellow" | "rose";
}

const colorStyles = {
  orange: {
    activeBg: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500 focus-visible:ring-orange-500",
    hoverBg: "hover:bg-orange-50 hover:text-orange-600 focus-visible:ring-orange-500",
    text: "text-orange-600",
  },
  blue: {
    activeBg: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 focus-visible:ring-blue-600",
    hoverBg: "hover:bg-blue-50 hover:text-blue-600 focus-visible:ring-blue-600",
    text: "text-blue-600",
  },
  sky: {
    activeBg: "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 focus-visible:ring-sky-600",
    hoverBg: "hover:bg-sky-50 hover:text-sky-600 focus-visible:ring-sky-600",
    text: "text-sky-600",
  },
  teal: {
    activeBg: "bg-teal-600 hover:bg-teal-700 text-white border-teal-600 focus-visible:ring-teal-600",
    hoverBg: "hover:bg-teal-50 hover:text-teal-600 focus-visible:ring-teal-600",
    text: "text-teal-600",
  },
  amber: {
    activeBg: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 focus-visible:ring-amber-500",
    hoverBg: "hover:bg-amber-50 hover:text-amber-600 focus-visible:ring-amber-500",
    text: "text-amber-600",
  },
  emerald: {
    activeBg: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 focus-visible:ring-emerald-600",
    hoverBg: "hover:bg-emerald-50 hover:text-emerald-600 focus-visible:ring-emerald-600",
    text: "text-emerald-600",
  },
  indigo: {
    activeBg: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 focus-visible:ring-indigo-600",
    hoverBg: "hover:bg-indigo-50 hover:text-indigo-600 focus-visible:ring-indigo-600",
    text: "text-indigo-600",
  },
  pink: {
    activeBg: "bg-pink-500 hover:bg-pink-600 text-white border-pink-500 focus-visible:ring-pink-500",
    hoverBg: "hover:bg-pink-50 hover:text-pink-600 focus-visible:ring-pink-500",
    text: "text-pink-600",
  },
  purple: {
    activeBg: "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 focus-visible:ring-purple-600",
    hoverBg: "hover:bg-purple-50 hover:text-purple-600 focus-visible:ring-purple-600",
    text: "text-purple-600",
  },
  yellow: {
    activeBg: "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 focus-visible:ring-yellow-500",
    hoverBg: "hover:bg-yellow-50 hover:text-yellow-600 focus-visible:ring-yellow-500",
    text: "text-yellow-600",
  },
  rose: {
    activeBg: "bg-rose-650 hover:bg-rose-700 text-white border-rose-650 focus-visible:ring-rose-650",
    hoverBg: "hover:bg-rose-50 hover:text-rose-650 focus-visible:ring-rose-650",
    text: "text-rose-650",
  },
};

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  variantColor = "blue",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const colors = colorStyles[variantColor] || colorStyles.blue;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push("ellipsis-start");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("ellipsis-end");
      }

      pages.push(totalPages);
    }
    return pages;
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-zinc-200 bg-zinc-50/50">
      {/* Page Size & Description */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-semibold text-zinc-500 w-full sm:w-auto">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <span className="whitespace-nowrap">Show per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-9 w-[70px] bg-white border-zinc-200 text-zinc-700 font-bold focus:ring-0">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent className="bg-white border border-zinc-200 rounded-xl min-w-[70px]">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="text-center sm:text-left w-full sm:w-auto mt-1 sm:mt-0 uppercase tracking-wider text-[10px] font-bold text-zinc-400">
          Showing <span className="text-zinc-600 font-bold">{startItem}</span> to{" "}
          <span className="text-zinc-600 font-bold">{endItem}</span> of{" "}
          <span className="text-zinc-600 font-bold">{totalItems}</span> entries
        </span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        {/* First Page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            "w-8 h-8 rounded-lg border-zinc-250 text-zinc-450 hover:bg-zinc-100 hover:text-zinc-800 transition-all",
            currentPage === 1 && "opacity-40 cursor-not-allowed"
          )}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "w-8 h-8 rounded-lg border-zinc-250 text-zinc-450 hover:bg-zinc-100 hover:text-zinc-800 transition-all",
            currentPage === 1 && "opacity-40 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page Numbers */}
        <div className="hidden md:flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === "ellipsis-start" || page === "ellipsis-end") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 font-bold text-xs"
                >
                  ...
                </span>
              );
            }

            const isPageActive = page === currentPage;

            return (
              <Button
                key={`page-${page}`}
                variant="outline"
                onClick={() => handlePageChange(Number(page))}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-bold transition-all border-zinc-250",
                  isPageActive
                    ? colors.activeBg
                    : "text-zinc-600 bg-white hover:bg-zinc-50"
                )}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Simple Page Display for Mobile */}
        <div className="flex md:hidden items-center px-3 text-xs font-bold text-zinc-600">
          Page {currentPage} of {totalPages}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "w-8 h-8 rounded-lg border-zinc-250 text-zinc-450 hover:bg-zinc-100 hover:text-zinc-800 transition-all",
            currentPage === totalPages && "opacity-40 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            "w-8 h-8 rounded-lg border-zinc-250 text-zinc-450 hover:bg-zinc-100 hover:text-zinc-800 transition-all",
            currentPage === totalPages && "opacity-40 cursor-not-allowed"
          )}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
