import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag, BadgePercent, Layers, CheckSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import ProductCard from "@/components/storefront/ProductCard";
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
  searchParams: { page?: string, sort?: string, category?: string, in_stock?: string, promo?: string }
}) {
  const supabase = await createClient();
  const currentPage = parseInt(searchParams.page || "1");
  const sortMode = searchParams.sort || "latest";
  const pageSize = 12;
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  // Mapping sort modes to Supabase order
  let orderColumn = "created_at";
  let orderOptions = { ascending: false };

  if (sortMode === "price_asc") {
    orderColumn = "price";
    orderOptions = { ascending: true };
  } else if (sortMode === "price_desc") {
    orderColumn = "price";
    orderOptions = { ascending: false };
  }

  const dealsPromise = supabase.from("deals").select("*").eq("is_active", true).order("position", { ascending: true }).limit(2);
  const categoriesPromise = supabase.from("categories").select("id, name, slug").is("parent_id", null).eq("status", "Active").order("name");

  let productsData: any[] = [];
  let totalCount = 0;

  const categoryFilter = searchParams.category;
  const inStockFilter = searchParams.in_stock === "true";
  const promoFilter = searchParams.promo === "true";

  // If a specific category is selected, we need to find its ID and its subcategories' IDs
  let categoryIds: string[] = [];
  if (categoryFilter && categoryFilter !== "all") {
    const { data: targetCat } = await supabase.from("categories").select("id").eq("slug", categoryFilter).single();
    if (targetCat) {
      const { data: subCats } = await supabase.from("categories").select("id").eq("parent_id", targetCat.id);
      categoryIds = [targetCat.id, ...(subCats || []).map(c => c.id)];
    }
  }

  // Build the base query for non-rating sort
  let query = supabase.from("products")
    .select("id, name, slug, price, sale_price, image_url, status, stock_quantity, moq, is_top_rated, created_at, categories(name, slug, parent_id, parent:categories!parent_id(name, slug)), product_reviews(rating)", { count: "exact" })
    .eq("status", "Active");

  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }
  if (inStockFilter) {
    query = query.gt("stock_quantity", 0);
  }
  if (promoFilter) {
    query = query.not("sale_price", "is", null);
  }

  if (sortMode === "rating") {
    // For rating sort, we fetch all matching without range because we sort in memory
    const { data: allProducts } = await query;
    
    const sorted = [...(allProducts || [])];
    sorted.sort((a, b) => {
      const aReviews = a.product_reviews || [];
      const bReviews = b.product_reviews || [];
      const aAvg = aReviews.length > 0 ? aReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / aReviews.length : 0;
      const bAvg = bReviews.length > 0 ? bReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / bReviews.length : 0;

      if (bAvg !== aAvg) return bAvg - aAvg;

      const aTop = a.is_top_rated ? 1 : 0;
      const bTop = b.is_top_rated ? 1 : 0;
      return bTop - aTop;
    });
    totalCount = sorted.length;
    productsData = sorted.slice(from, to + 1);
  } else {
    // Standard database sorting and pagination
    query = query.order(orderColumn, orderOptions).range(from, to);
    const { data, count: dbCount } = await query;
    productsData = data || [];
    totalCount = dbCount || 0;
  }

  const { data: categoriesResult } = await categoriesPromise;
  const categoriesList = categoriesResult || [];

  const { data: deals } = await dealsPromise;
  const count = totalCount;
  const totalPages = Math.ceil(totalCount / pageSize);
  const sortedProducts = productsData;

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
              Precision Supplies
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
            <aside className="flex flex-col gap-6 lg:sticky lg:top-6">

            <ProductSidebarFilters categories={categoriesList} />

            {/* Static Placement Deals Sidebar */}
            {(deals || []).map((deal: any) => (
              <Link
                key={deal.id}
                href={deal.link_url}
                className="block group relative overflow-hidden bg-zinc-950 p-6 rounded-xl shadow-md border border-zinc-800 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-3 right-3">
                  <BadgePercent className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="relative z-10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{deal.badge_text || "OFFER"}</span>
                  <h4 className="text-md font-bold text-white leading-tight uppercase tracking-tight">{deal.title}</h4>
                  <p className="text-xs text-zinc-400 font-normal leading-relaxed line-clamp-2">{deal.description}</p>
                  <div className="pt-2 flex items-center gap-1.5 text-white text-[11px] font-semibold tracking-wide">
                    Claim Deal <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
                {deal.image_url && (
                  <div className="absolute -right-2 -bottom-2 w-16 h-16 opacity-15 group-hover:opacity-30 transition-opacity">
                    <Image src={deal.image_url} alt="" fill sizes="64px" className="object-contain" />
                  </div>
                )}
              </Link>
            ))}
            </aside>
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
              /* Global Core Empty State container */
              <div className="border border-zinc-200 bg-white rounded-xl py-20 px-4 text-center shadow-2xs max-w-xl mx-auto">
                <ShoppingBag className="mx-auto h-12 w-12 text-zinc-350 mb-4" />
                <h3 className="text-md font-bold text-zinc-900 mb-1">No products found</h3>
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
