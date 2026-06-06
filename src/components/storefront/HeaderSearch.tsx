"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Suspense } from "react";

function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const currentMain = searchParams.get("main");
      const currentSub = searchParams.get("sub");
      let url = `/search?q=${encodeURIComponent(query.trim())}`;
      if (currentMain) url += `&main=${currentMain}`;
      if (currentSub) url += `&sub=${currentSub}`;
      router.push(url);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative hidden flex-1 md:block">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, brands, and business essentials"
        className="h-12 w-full rounded-full border border-orange-100 bg-orange-50 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white"
      />
    </form>
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
