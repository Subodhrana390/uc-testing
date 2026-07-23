import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createStaticClient } from "@/utils/supabase/static";
import { fetchProductsFiltered } from "@/app/actions/products";
import ProductSidebarFilters from "@/components/storefront/ProductSidebarFilters";
import MobileFilterWrapper from "@/components/storefront/MobileFilterWrapper";
import MobileFilterToggle from "@/components/storefront/MobileFilterToggle";
import MobileFloatingActionBar from "@/components/storefront/MobileFloatingActionBar";
import SortDropdown from "@/components/storefront/SortDropdown";
import InfiniteProductList from "@/components/storefront/InfiniteProductList";
import Pagination from "@/components/storefront/Pagination";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, itemListSchema, webPageSchema, faqSchema } from "@/lib/jsonld";
import { categoryMetadata, SITE_URL } from "@/lib/seo";
import dynamic from "next/dynamic";

const FAQAccordion = dynamic(() => import("@/components/storefront/FAQAccordion"));
import RecommendedProducts from "@/components/storefront/RecommendedProducts";

export const revalidate = 3600; // ISR — revalidate every hour

// ─── Static params for build-time pre-rendering ────────────────────────────
export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .eq("status", true);
  return (categories || []).map((c) => ({ slug: c.slug }));
}

// ─── Dynamic metadata ────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}): Promise<Metadata> {
  const supabase = createStaticClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, seo_title, seo_description")
    .eq("slug", params.slug)
    .single();

  if (!category) {
    return { title: "Category Not Found", robots: { index: false, follow: false } };
  }

  // Count products in this category
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", category.id);

  const pageNum = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  return categoryMetadata({
    name: category.seo_title || category.name,
    slug: category.slug,
    description: category.seo_description || category.description,
    image_url: category.image_url,
    productCount: count || undefined,
    page: !isNaN(pageNum) && pageNum > 0 ? pageNum : 1,
  });
}

// ─── Page component (Server Component) ───────────────────────────────────────
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string; sort?: string; in_stock?: string; out_of_stock?: string; promo?: string; min_price?: string; max_price?: string; brand?: string };
}) {
  const supabase = createStaticClient();
  const currentPage = parseInt(searchParams.page || "1");
  const pageSize = 12;
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!category) {
    notFound();
  }

  let activeParentCategory = null;
  let activeSiblingCategories: any[] = [];
  let categoryIds = [category.id];

  if (category.parent_id) {
    // Current category is a subcategory
    const { data: parent } = await supabase.from("categories").select("*").eq("id", category.parent_id).single();
    activeParentCategory = parent;

    const { data: siblings } = await supabase.from("categories").select("id, name, slug").eq("parent_id", category.parent_id).order("name");
    activeSiblingCategories = siblings || [];

    categoryIds = [category.id];
  } else {
    // Current category is a top-level parent
    activeParentCategory = category;

    const { data: subs } = await supabase.from("categories").select("id, name, slug").eq("parent_id", category.id).order("name");
    activeSiblingCategories = subs || [];

    categoryIds = [category.id, ...activeSiblingCategories.map(s => s.id)];
  }

  // Fetch only brands relevant to this category (brands that have products in this category)
  const { data: relevantBrandRows } = await supabase
    .from("products")
    .select("brand_id")
    .in("category_id", categoryIds)
    .eq("status", "Active")
    .not("brand_id", "is", null);
  const relevantBrandIds = [...new Set((relevantBrandRows || []).map((r: any) => r.brand_id).filter(Boolean))];

  const brandsPromise = relevantBrandIds.length > 0
    ? supabase.from("brands").select("id, name").in("id", relevantBrandIds).order("name")
    : Promise.resolve({ data: [] as any[] });
  const categoriesPromise = supabase.from("categories").select("id, name, slug").is("parent_id", null).eq("status", true).order("name");
  const attributesPromise = supabase.from("attributes").select("id, name, options").eq("is_filterable", true).order("display_order");

  // Fetch filtered products using the unified server action query
  const { products: safeProducts, totalCount: safeTotalCount } = await fetchProductsFiltered(
    currentPage,
    { ...searchParams, category: category.slug }
  );

  const faqsPromise = supabase.from("faqs").select("id, question, answer, category").eq("is_published", true).order("sort_order", { ascending: true }).limit(3);

  const [categoriesResult, brandsResult, attributesResult, faqsResult] = await Promise.all([
    categoriesPromise,
    brandsPromise,
    attributesPromise,
    faqsPromise
  ]);

  const categoriesList = categoriesResult.data || [];
  const brandsList = brandsResult.data || [];
  const attributesList = attributesResult.data || [];
  const safeFaqs = faqsResult.data || [];
  const totalPages = Math.ceil(safeTotalCount / 12);

  const categoryUrl = `${SITE_URL}/categories/${category.slug}`;

  return (
    <div className="bg-zinc-50/30 min-h-screen">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Categories", url: `${SITE_URL}/categories` },
          { name: category.name, url: categoryUrl },
        ]),
        webPageSchema({
          name: category.seo_title || `${category.name} — Buy Online at Best Price`,
          description: category.seo_description || category.description || `Shop ${category.name} at UC Enterprises with competitive wholesale pricing and pan-India delivery.`,
          url: categoryUrl,
          type: "CollectionPage",
        }),
        ...(safeProducts.length > 0 ? [itemListSchema(safeProducts, category.name, categoryUrl)] : []),
        faqSchema(safeFaqs),
      ]} />

      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
            <li><Link prefetch={false} href="/">Home</Link></li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li><Link prefetch={false} href="/categories">Categories</Link></li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li className="text-zinc-700">{category.name}</li>
          </ol>
        </nav>

        <div className="mt-6 border-b border-zinc-200/80 pb-8 mb-8">
          <h1 className="mt-3 text-4xl md:text-5xl font-black tracking-tight text-zinc-900">{category.name}</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-500 font-medium leading-relaxed">
            {category.description || "Explore live products under this category with updated pricing and storefront links."}
          </p>
        </div>

        {/* Sorting & Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <MobileFilterToggle />
          <div className="flex items-center gap-3 ml-auto">
            <Suspense fallback={<div className="h-9 w-40 animate-pulse bg-zinc-100 rounded-lg" />}>
              <SortDropdown />
            </Suspense>
            <span className="text-xs font-medium text-zinc-500 bg-white border border-zinc-200 px-3 h-9 flex items-center rounded-lg shadow-2xs">
              Total:&nbsp;<span className="font-semibold text-zinc-900">{safeTotalCount || 0} Items</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 items-start">

          <MobileFilterWrapper>
            <ProductSidebarFilters
              categories={categoriesList}
              brands={brandsList}
              attributes={attributesList}
              currentCategorySlug={category.slug}
              activeParentCategory={activeParentCategory}
              activeSiblingCategories={activeSiblingCategories}
            />
          </MobileFilterWrapper>

          <div className="lg:col-span-3 space-y-10">

            <InfiniteProductList
              initialProducts={safeProducts}
              searchParams={{ ...searchParams, category: category.slug }}
              totalPages={totalPages}
            />

            {!safeProducts.length && (
              <div className="space-y-12 w-full">
                {/* No Products Found */}
                <div className="border border-zinc-200/80 bg-white p-8 rounded-xl shadow-2xs text-center flex flex-col items-center justify-center">
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">No products found</h3>
                </div>

                {/* Browse Other Categories */}
                {categoriesList.length > 0 && (
                  <div className="space-y-6 pt-4">
                    <div className="border-b border-zinc-100 pb-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Browse Other Departments</h4>
                    </div>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      {categoriesList
                        .filter(c => c.slug !== category.slug)
                        .slice(0, 6)
                        .map((otherCat) => (
                          <Link prefetch={false}
                            key={otherCat.id}
                            href={`/categories/${otherCat.slug}`}
                            className="flex items-center justify-between p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-primary/30 hover:shadow-sm transition-all group animate-fade-in"
                          >
                            <span className="font-bold text-sm text-zinc-800 group-hover:text-primary transition-colors">{otherCat.name}</span>
                            <span className="text-zinc-400 group-hover:text-primary transition-colors">→</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pagination Segment Footer */}
            {totalPages > 1 && (
              <div className="pt-4 border-t border-zinc-200/60 hidden md:block">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  baseUrl={`/categories/${category.slug}`}
                  preserveParams={{ ...searchParams } as Record<string, string>}
                />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Recommendations */}
        <div className="mt-16 border-t border-zinc-200/60 pt-12">
          <RecommendedProducts maxItems={8} categoryId={category.id} />
        </div>

        {/* Category FAQ Section */}
        <div className="mt-16 border-t border-zinc-200/60 pt-12">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-sm text-zinc-500 mt-2">Everything you need to know about purchasing {category.name}</p>
          </div>
          <FAQAccordion items={safeFaqs} className="max-w-3xl mx-auto" />
        </div>
      </section>

      {/* Floating Mobile Actions for Infinite Scroll */}
      <MobileFloatingActionBar />
    </div>
  );
}
