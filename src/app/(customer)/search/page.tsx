import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchProductsFiltered } from "@/app/actions/products";
import InfiniteProductList from "@/components/storefront/InfiniteProductList";
import Pagination from "@/components/storefront/Pagination";
import SortDropdown from "@/components/storefront/SortDropdown";
import MobileFilterWrapper from "@/components/storefront/MobileFilterWrapper";
import MobileFilterToggle from "@/components/storefront/MobileFilterToggle";
import MobileFloatingActionBar from "@/components/storefront/MobileFloatingActionBar";
import ProductSidebarFilters from "@/components/storefront/ProductSidebarFilters";
import JsonLd from "@/components/seo/JsonLd";
import { itemListSchema, breadcrumbSchema, webPageSchema } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}): Promise<Metadata> {
  const query = searchParams.q || "";
  return {
    title: query ? `Search Results for "${query}"` : "Search Catalog",
    description: `Browse product search results for ${query} on UC Enterprises. Wholesale pricing and pan-India delivery.`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    page?: string;
    sort?: string;
    category?: string;
    in_stock?: string;
    out_of_stock?: string;
    promo?: string;
    min_price?: string;
    max_price?: string;
    brand?: string;
    rating?: string;
  };
}) {
  const supabase = await createClient();
  const currentPage = parseInt(searchParams.page || "1");
  const query = searchParams.q || "";
  const pageSize = 12;

  // Parallel fetches for filter sidebar categories, brands, and custom attributes
  const categoriesPromise = supabase.from("categories").select("id, name, slug").is("parent_id", null).eq("status", true).order("name");
  const brandsPromise = supabase.from("brands").select("id, name").order("name");
  const attributesPromise = supabase.from("attributes").select("id, name, options").eq("is_filterable", true).order("display_order");

  // Fetch filtered products using the unified server action query
  let { products: sortedProducts, totalCount } = await fetchProductsFiltered(currentPage, searchParams);
  let showingAlternate = false;
  let didYouMean: string | null = null;
  let spellingSuggestions: any = null;

  if (query && totalCount === 0) {
    const { data: suggestionsData } = await supabase.rpc("get_smart_search_suggestions", {
      search_query: query
    });
    spellingSuggestions = suggestionsData;

    if (suggestionsData?.did_you_mean) {
      didYouMean = suggestionsData.did_you_mean;
      const alternateResults = await fetchProductsFiltered(currentPage, { ...searchParams, q: didYouMean });
      if (alternateResults.totalCount > 0) {
        sortedProducts = alternateResults.products;
        totalCount = alternateResults.totalCount;
        showingAlternate = true;
      }
    }
  }

  const [categoriesResult, brandsResult, attributesResult] = await Promise.all([
    categoriesPromise,
    brandsPromise,
    attributesPromise
  ]);

  const categoriesList = categoriesResult.data || [];
  const brandsList = brandsResult.data || [];
  const attributesList = attributesResult.data || [];

  const count = totalCount;
  const totalPages = Math.ceil(totalCount / pageSize);

  const pageTitle = query 
    ? (showingAlternate ? `Results for "${didYouMean}"` : `Results for "${query}"`) 
    : "All Products";

  return (
    <div className="bg-zinc-50/60 min-h-screen text-zinc-900 antialiased">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Search Results", url: `${SITE_URL}/search` },
        ]),
        itemListSchema(sortedProducts, "Search Results", `${SITE_URL}/search`),
        webPageSchema({
          name: query ? `Search Results for "${query}"` : "Product Search Catalog",
          description: "Search UC Enterprises' complete product catalogue.",
          url: `${SITE_URL}/search`,
        }),
      ]} />
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-6 lg:px-8 py-12">

        {/* Top Header Grid Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Search className="w-3.5 h-3.5" /> Catalog Exploration
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900">
              {pageTitle}
            </h1>
            <p className="max-w-2xl text-xs md:text-sm leading-relaxed text-zinc-500 font-medium">
              Browse matches in laboratory chemicals, specialty glassware, and industrial equipment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto mt-4 md:mt-0 w-full md:w-auto">
            <MobileFilterToggle />
            <Suspense fallback={<div className="h-9 w-40 animate-pulse bg-zinc-100 rounded-lg" />}>
              <SortDropdown />
            </Suspense>
            <span className="text-xs font-medium text-zinc-500 bg-white border border-zinc-200 px-3 h-9 flex items-center rounded-lg shadow-2xs">
              Total SKU:&nbsp;<span className="font-semibold text-zinc-900">{count || 0} Items</span>
            </span>
          </div>
        </div>

        {/* Content Structure */}
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 items-start">

          {/* Refined Filters Sidebar */}
          <MobileFilterWrapper>
            <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
              <ProductSidebarFilters 
                categories={categoriesList} 
                brands={brandsList} 
                attributes={attributesList} 
              />
            </aside>
          </MobileFilterWrapper>

          {/* Dynamic Interactive Products Module */}
          <div className="lg:col-span-3 space-y-10">
            {showingAlternate && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs font-semibold text-amber-800 flex flex-col gap-1 shadow-xs animate-in fade-in duration-200">
                <p>
                  No exact matches found for "<span className="font-bold text-amber-900">{query}</span>".
                </p>
                <p>
                  Showing results for spelling suggestion "<span className="font-bold text-amber-900 italic">{didYouMean}</span>" instead.
                </p>
              </div>
            )}

            {sortedProducts.length > 0 ? (
              <InfiniteProductList
                initialProducts={sortedProducts}
                searchParams={{ ...searchParams, q: showingAlternate ? didYouMean! : query }}
                totalPages={totalPages}
              />
            ) : (
              <div className="group border border-dashed border-zinc-200 rounded-2xl py-16 px-6 text-center max-w-sm mx-auto bg-gradient-to-b from-white to-zinc-50/50 shadow-sm transition-all duration-300 hover:border-zinc-350">
                <div className="mx-auto h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mb-5 group-hover:bg-zinc-100/80 transition-colors">
                  <ShoppingBag className="h-6 w-6 text-zinc-400 group-hover:scale-105 transition-transform duration-300" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
                  No products found
                </h3>
                <p className="text-xs text-zinc-500 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                  We couldn't find anything matching your filters or search query.
                </p>

                {/* Related Search Suggestions list */}
                {spellingSuggestions && (spellingSuggestions.categories?.length > 0 || spellingSuggestions.brands?.length > 0) && (
                  <div className="mt-8 pt-6 border-t border-zinc-100 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Related Departments & Lenders</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {spellingSuggestions.categories.map((cat: any) => (
                        <Link
                          key={cat.id}
                          href={`/categories/${cat.slug}`}
                          className="px-3 py-1.5 rounded-full bg-white border border-zinc-250 text-[10px] font-bold text-zinc-650 hover:bg-zinc-50 hover:text-zinc-950 transition-all hover:border-zinc-350 shadow-2xs"
                        >
                          Category: {cat.name}
                        </Link>
                      ))}
                      {spellingSuggestions.brands.map((brand: any) => (
                        <Link
                          key={brand.id}
                          href={`/products?brand=${encodeURIComponent(brand.name)}`}
                          className="px-3 py-1.5 rounded-full bg-white border border-zinc-250 text-[10px] font-bold text-zinc-650 hover:bg-zinc-50 hover:text-zinc-950 transition-all hover:border-zinc-350 shadow-2xs"
                        >
                          Brand: {brand.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center text-xs font-medium h-9 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-sm"
                  >
                    Clear Filters
                  </Link>
                </div>
              </div>
            )}

            {/* Pagination Segment Footer */}
            {totalPages > 1 && (
              <div className="pt-4 border-t border-zinc-200/60 hidden md:block">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  baseUrl="/search"
                  preserveParams={{ ...searchParams, q: showingAlternate ? didYouMean! : query }}
                />
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Floating Mobile Actions for Infinite Scroll */}
      <MobileFloatingActionBar />

    </div>
  );
}
