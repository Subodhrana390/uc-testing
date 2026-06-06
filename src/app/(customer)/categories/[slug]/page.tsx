import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createStaticClient } from "@/utils/supabase/static";
import ProductCard from "@/components/storefront/ProductCard";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, itemListSchema, webPageSchema } from "@/lib/jsonld";
import { categoryMetadata, SITE_URL } from "@/lib/seo";

export const revalidate = 3600; // ISR — revalidate every hour

// ─── Static params for build-time pre-rendering ────────────────────────────
export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .eq("status", "Active");
  return (categories || []).map((c) => ({ slug: c.slug }));
}

// ─── Dynamic metadata ────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const supabase = createStaticClient();
  const { data: category } = await supabase
    .from("categories")
    .select("name, slug, description, image_url")
    .eq("slug", params.slug)
    .single();

  if (!category) {
    return { title: "Category Not Found", robots: { index: false, follow: false } };
  }

  // Count products in this category
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", category.slug);

  return categoryMetadata({
    name: category.name,
    slug: category.slug,
    description: category.description,
    image_url: category.image_url,
    productCount: count || undefined,
  });
}

// ─── Page component (Server Component) ───────────────────────────────────────
export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createStaticClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!category) {
    notFound();
  }

  // Fetch subcategory IDs too (show parent + sub products)
  const { data: subCategories } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", category.id);

  const categoryIds = [category.id, ...(subCategories?.map((s) => s.id) || [])];

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, sale_price, image_url, status, stock_quantity, moq, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)"
    )
    .in("category_id", categoryIds)
    .eq("status", "Active")
    .order("created_at", { ascending: false });

  const safeProducts = products || [];
  const categoryUrl = `${SITE_URL}/categories/${category.slug}`;

  return (
    <div className="bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_100%)]">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Categories", url: `${SITE_URL}/categories` },
          { name: category.name, url: categoryUrl },
        ]),
        webPageSchema({
          name: `${category.name} — Buy Online at Best Price`,
          description: category.description || `Shop ${category.name} at UC Enterprises with competitive wholesale pricing and pan-India delivery.`,
          url: categoryUrl,
          type: "CollectionPage",
        }),
        ...(safeProducts.length > 0 ? [itemListSchema(safeProducts, category.name, categoryUrl)] : []),
      ]} />

      <section className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
            <li><Link href="/">Home</Link></li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li><Link href="/categories">Categories</Link></li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li className="text-zinc-700">{category.name}</li>
          </ol>
        </nav>

        <div className="mt-6 border border-orange-100 bg-zinc-950 p-8 text-white">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Category</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{category.name}</h1>
          {category.description && (
            <p className="mt-3 max-w-2xl text-sm text-zinc-300">{category.description}</p>
          )}
          {!category.description && (
            <p className="mt-3 max-w-2xl text-sm text-zinc-300">
              Explore live products under this category with updated pricing and storefront links.
            </p>
          )}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {safeProducts.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>

        {!safeProducts.length && (
          <div className="mt-10 border border-dashed border-orange-200 bg-white p-10 text-center text-sm font-semibold text-zinc-600">
            No products are currently published in this category.
          </div>
        )}
      </section>
    </div>
  );
}
