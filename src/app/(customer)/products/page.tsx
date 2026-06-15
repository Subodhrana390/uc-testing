import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
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
import { productsListingMetadata, SITE_URL } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string };
}): Promise<Metadata> {
  const page = parseInt(searchParams.page || "1");
  const sort = searchParams.sort || "latest";
  return productsListingMetadata(page, sort);
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: { page?: string, sort?: string, category?: string, in_stock?: string, out_of_stock?: string, promo?: string, min_price?: string, max_price?: string, brand?: string }
}) {
  const supabase = await createClient();
  const currentPage = parseInt(searchParams.page || "1");
  const pageSize = 12;

  // Parallel fetches for filter sidebar categories, brands, and custom attributes
  const categoriesPromise = supabase.from("categories").select("id, name, slug").is("parent_id", null).eq("status", true).order("name");
  const brandsPromise = supabase.from("brands").select("id, name").order("name");
  const attributesPromise = supabase.from("attributes").select("id, name, options").eq("is_filterable", true).order("display_order");

  // Fetch filtered products using the unified server action query
  const { products: sortedProducts, totalCount } = await fetchProductsFiltered(currentPage, searchParams);

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

  return (
    <div className="bg-zinc-50/60 min-h-screen text-zinc-900 antialiased">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "All Products", url: `${SITE_URL}/products` },
        ]),
        itemListSchema(sortedProducts, "Laboratory & Industrial Products", `${SITE_URL}/products`),
        webPageSchema({
          name: "All Products — Laboratory Chemicals, Glassware & Industrial Supplies",
          description: "Browse UC Enterprises' complete product catalogue. Wholesale pricing, pan-India delivery.",
          url: `${SITE_URL}/products`,
        }),
      ]} />
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-6 lg:px-8 py-12">

        {/* Top Header Grid Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900">
              Explore Our Product Catalog
            </h1>
            <p className="max-w-2xl text-xs md:text-sm leading-relaxed text-zinc-500 font-medium">
              Explore our laboratory chemicals, specialty glassware, and industrial equipment engineered for enterprise scale operations.
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
            <ProductSidebarFilters categories={categoriesList} brands={brandsList} attributes={attributesList} />
          </MobileFilterWrapper>

          {/* Dynamic Interactive Products Module */}
          <div className="lg:col-span-3 space-y-10">
            {sortedProducts.length > 0 ? (
              <InfiniteProductList
                initialProducts={sortedProducts}
                searchParams={searchParams as Record<string, string>}
                totalPages={totalPages}
              />
            ) : (
              <div className="group border-2 border-dashed border-zinc-100 rounded-2xl py-16 px-6 text-center max-w-sm mx-auto bg-gradient-to-b from-white to-zinc-50/50 shadow-sm transition-all duration-300 hover:border-zinc-200">
                <div className="mx-auto h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mb-5 group-hover:bg-zinc-100/80 transition-colors">
                  <ShoppingBag className="h-6 w-6 text-zinc-400 group-hover:scale-105 transition-transform duration-300" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
                  No products found
                </h3>
                <p className="text-xs text-zinc-500 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                  We couldn't find anything matching your current filters or search term.
                </p>
                <div className="mt-6">
                  <Link
                    href="/products"
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
                  baseUrl="/products"
                  preserveParams={searchParams as Record<string, string>}
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
