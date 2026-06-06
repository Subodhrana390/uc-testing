"use client";

import { Search, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";

function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Click outside listener to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced query fetching
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce duration: 300ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      setShowSuggestions(false);
      router.push(`/products/${suggestions[activeIndex].slug}`);
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
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
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

  return (
    <div ref={containerRef} className="relative hidden flex-1 md:block max-w-lg">
      <form onSubmit={handleFormSubmit} className="relative w-full">
        {loading ? (
          <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
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
          placeholder="Search products, brands, and business essentials"
          className="h-12 w-full rounded-full border border-orange-100 bg-orange-50 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white"
        />
      </form>

      {/* Auto Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-14 left-0 right-0 z-50 overflow-hidden bg-white border border-zinc-200 shadow-2xl rounded-2xl animate-in fade-in duration-150">
          <ul className="divide-y divide-zinc-100 max-h-[350px] overflow-y-auto">
            {suggestions.map((item, index) => (
              <li
                key={item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setShowSuggestions(false);
                  router.push(`/products/${item.slug}`);
                }}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                  index === activeIndex ? "bg-zinc-50 border-l-2 border-primary pl-[14px]" : "pl-4"
                }`}
              >
                <div className="relative w-10 h-10 overflow-hidden bg-zinc-50 rounded-lg shrink-0 border border-zinc-150 flex items-center justify-center">
                  <img
                    src={item.image_url || "/images/prod_main.png"}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain p-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-900 truncate">
                    {highlightMatch(item.name, query)}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                    {item.sale_price ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-zinc-950 font-black">₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                        <span className="line-through text-zinc-300">₹{parseFloat(item.sale_price).toLocaleString('en-IN')}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-950 font-black">₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function HeaderSearch() {
  return (
    <Suspense fallback={
      <div className="h-12 w-full rounded-full border border-orange-100 bg-orange-50 animate-pulse" />
    }>
      <SearchInput />
    </Suspense>
  );
}
