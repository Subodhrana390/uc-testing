"use client";

import { Search, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SuggestionResponse {
  products: any[];
  categories: any[];
  brands: any[];
  did_you_mean: string | null;
}

function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Close suggestions overlay on clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  const { data: suggestions = { products: [], categories: [], brands: [], did_you_mean: null }, isLoading: loading } = useQuery({
    queryKey: ["search-suggestions", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 1) return { products: [], categories: [], brands: [], did_you_mean: null };
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.json() as Promise<SuggestionResponse>;
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 60 * 1000, // 1 minute
  });

  // Flatten suggestions into a unified array to handle standard keyboard selection
  const flatItems = useMemo(() => {
    const items: any[] = [];
    if (suggestions.did_you_mean) {
      items.push({ type: "did_you_mean", id: "dym", name: suggestions.did_you_mean });
    }
    suggestions.categories.forEach(cat => {
      items.push({ type: "category", id: cat.id, name: cat.name, slug: cat.slug });
    });
    suggestions.brands.forEach(brand => {
      items.push({ type: "brand", id: brand.id, name: brand.name });
    });
    suggestions.products.forEach(prod => {
      items.push({
        type: "product",
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        image_url: prod.image_url,
        price: prod.price,
        sale_price: prod.sale_price
      });
    });
    return items;
  }, [suggestions]);

  // Helper to locate active index in flat lists
  const getItemIndex = (type: string, id: string) => {
    return flatItems.findIndex(item => item.type === type && item.id === id);
  };

  const handleSearchSubmit = (searchQuery: string) => {
    if (searchQuery.trim()) {
      const currentMain = searchParams.get("main");
      const currentSub = searchParams.get("sub");
      let url = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      if (currentMain) url += `&main=${currentMain}`;
      if (currentSub) url += `&sub=${currentSub}`;
      setShowSuggestions(false);
      router.push(url);
    }
  };

  const triggerSelection = (item: any) => {
    setShowSuggestions(false);
    if (item.type === "did_you_mean") {
      setQuery(item.name);
      handleSearchSubmit(item.name);
    } else if (item.type === "category") {
      router.push(`/categories/${item.slug}`);
    } else if (item.type === "brand") {
      router.push(`/products?brand=${encodeURIComponent(item.name)}`);
    } else if (item.type === "product") {
      router.push(`/products/${item.slug}`);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && flatItems[activeIndex]) {
      triggerSelection(flatItems[activeIndex]);
    } else {
      handleSearchSubmit(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSuggestions) {
        setShowSuggestions(true);
        return;
      }
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-amber-100 text-amber-900 font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const hasSuggestions = flatItems.length > 0;

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <form onSubmit={handleFormSubmit} className="relative w-full">
        {loading ? (
          <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary animate-spin z-10" />
        ) : (
          <button
            type="submit"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-full cursor-pointer z-10"
            aria-label="Submit Search"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        <input
          type="text"
          value={query}
          onFocus={() => setShowSuggestions(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search products, categories, brands..."
          className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-100/50 pl-10 pr-4 text-sm text-left outline-none transition-all hover:bg-zinc-100 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-inner"
        />
      </form>

      {/* Auto Suggestions Grouped Dropdown */}
      {showSuggestions && hasSuggestions && (
        <div className="absolute top-14 left-0 right-0 z-50 overflow-hidden bg-white border border-zinc-200 shadow-2xl rounded-2xl animate-in fade-in duration-150 divide-y divide-zinc-150 max-h-[450px] overflow-y-auto custom-scrollbar">
          
          {/* Typo Correction Banner */}
          {suggestions.did_you_mean && (() => {
            const index = getItemIndex("did_you_mean", "dym");
            const isHighlighted = index === activeIndex;
            return (
              <Link 
                href={`/search?q=${encodeURIComponent(suggestions.did_you_mean || "")}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setQuery(suggestions.did_you_mean || "");
                  setShowSuggestions(false);
                }}
                className={cn(
                  "px-5 py-3.5 text-xs flex items-center justify-between cursor-pointer transition-colors border-b border-zinc-100 bg-zinc-50/50 block",
                  isHighlighted ? "bg-orange-50 border-l-2 border-primary pl-[18px]" : ""
                )}
              >
                <span className="text-zinc-600 font-semibold">
                  Spelling suggestion: Did you mean <strong className="text-primary font-black">{suggestions.did_you_mean}</strong>?
                </span>
                <span className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider">Tab / Enter</span>
              </Link>
            );
          })()}

          {/* Categories Matches */}
          {suggestions.categories.length > 0 && (
            <div className="p-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 mb-1">Categories</h4>
              <div className="space-y-0.5">
                {suggestions.categories.map((cat) => {
                  const index = getItemIndex("category", cat.id);
                  const isHighlighted = index === activeIndex;
                  return (
                    <Link
                      key={cat.id}
                      href={`/categories/${cat.slug}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => setShowSuggestions(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all flex",
                        isHighlighted ? "bg-zinc-50 font-bold text-primary pl-4" : "text-zinc-700 hover:bg-zinc-50/50"
                      )}
                    >
                      <span className="text-xs font-semibold">{cat.name}</span>
                      <span className="text-[9px] font-bold text-zinc-455 uppercase tracking-widest">Category &rarr;</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brands Matches */}
          {suggestions.brands.length > 0 && (
            <div className="p-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 mb-1">Brands</h4>
              <div className="space-y-0.5">
                {suggestions.brands.map((brand) => {
                  const index = getItemIndex("brand", brand.id);
                  const isHighlighted = index === activeIndex;
                  return (
                    <Link
                      key={brand.id}
                      href={`/products?brand=${encodeURIComponent(brand.name)}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => setShowSuggestions(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all flex",
                        isHighlighted ? "bg-zinc-50 font-bold text-primary pl-4" : "text-zinc-700 hover:bg-zinc-50/50"
                      )}
                    >
                      <span className="text-xs font-semibold">{brand.name}</span>
                      <span className="text-[9px] font-bold text-zinc-455 uppercase tracking-widest">Brand &rarr;</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Matches */}
          {suggestions.products.length > 0 && (
            <div className="p-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 mb-2">Products</h4>
              <div className="space-y-1">
                {suggestions.products.map((prod) => {
                  const index = getItemIndex("product", prod.id);
                  const isHighlighted = index === activeIndex;
                  return (
                    <Link
                      key={prod.id}
                      href={`/products/${prod.slug}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => setShowSuggestions(false)}
                      className={cn(
                        "flex items-center gap-4 px-3 py-2 rounded-xl cursor-pointer transition-all flex",
                        isHighlighted ? "bg-zinc-50 pl-4 border-l-2 border-primary" : "hover:bg-zinc-50/50"
                      )}
                    >
                      <div className="relative w-10 h-10 overflow-hidden bg-zinc-50 rounded-lg shrink-0 border border-zinc-100 flex items-center justify-center">
                        <Image
                          src={prod.image_url || "/images/prod_main.png"}
                          alt={prod.name}
                          width={40}
                          height={40}
                          className="max-h-full max-w-full object-contain p-1"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-zinc-900 truncate">
                          {highlightMatch(prod.name, query)}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                          {prod.sale_price ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-zinc-950 font-black">₹{parseFloat(prod.sale_price).toLocaleString('en-IN')}</span>
                              <span className="line-through text-zinc-350">₹{parseFloat(prod.price).toLocaleString('en-IN')}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-950 font-black">₹{parseFloat(prod.price).toLocaleString('en-IN')}</span>
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HeaderSearch() {
  return (
    <Suspense fallback={
      <div className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-100/50 animate-pulse" />
    }>
      <SearchInput />
    </Suspense>
  );
}
