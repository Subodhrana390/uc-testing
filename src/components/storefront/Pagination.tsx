import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Logic to show a limited number of page buttons if totalPages is large
  const visiblePages = pages.filter(page => {
    if (totalPages <= 7) return true;
    return (
      page === 1 ||
      page === totalPages ||
      (page >= currentPage - 1 && page <= currentPage + 1)
    );
  });

  const renderPageButton = (page: number | string, index: number) => {
    const isCurrent = page === currentPage;
    
    return (
      <Link
        key={index}
        href={`${baseUrl}?page=${page}`}
        className={`flex h-10 w-10 items-center justify-center border text-[10px] font-black transition-all ${
          isCurrent 
            ? "bg-zinc-950 text-white border-zinc-950" 
            : "bg-white text-zinc-500 border-zinc-100 hover:border-primary hover:text-primary"
        }`}
      >
        {page}
      </Link>
    );
  };

  return (
    <div className="flex items-center justify-center gap-2 py-10">
      <Link
        href={`${baseUrl}?page=${Math.max(1, currentPage - 1)}`}
        className={`flex h-10 w-10 items-center justify-center border border-zinc-100 bg-white text-zinc-500 transition-all hover:border-primary hover:text-primary ${currentPage === 1 ? "pointer-events-none opacity-30" : ""}`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {visiblePages.map((page, index) => {
        const prevPage = visiblePages[index - 1];
        const elements = [];
        
        if (prevPage && page - prevPage > 1) {
          elements.push(
            <span key={`ellipsis-${index}`} className="flex h-10 w-10 items-center justify-center text-zinc-300">...</span>
          );
        }
        
        elements.push(renderPageButton(page, index));
        return elements;
      })}

      <Link
        href={`${baseUrl}?page=${Math.min(totalPages, currentPage + 1)}`}
        className={`flex h-10 w-10 items-center justify-center border border-zinc-100 bg-white text-zinc-500 transition-all hover:border-primary hover:text-primary ${currentPage === totalPages ? "pointer-events-none opacity-30" : ""}`}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
