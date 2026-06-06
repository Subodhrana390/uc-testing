import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import JsonLd from "@/components/seo/JsonLd";
import { productSchema, breadcrumbSchema, webPageSchema } from "@/lib/jsonld";
import { productMetadata, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

// ─── Pre-render popular products at build time ────────────────────────────────
export async function generateStaticParams() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "Active")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data || []).map((p) => ({ slug: p.slug }));
}

// ─── Dynamic metadata per product ────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select(
      "name, slug, description, price, sale_price, image_url, status, stock_quantity, categories(name), brands(name)"
    )
    .eq("slug", params.slug)
    .single();

  if (!p)
    return {
      title: "Product Not Found",
      robots: { index: false, follow: false },
    };

  return productMetadata({
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    sale_price: p.sale_price,
    image_url: p.image_url,
    categoryName: (p.categories as any)?.name,
    brandName: (p.brands as any)?.name,
    inStock:
      p.status === "Active" &&
      (p.stock_quantity === undefined || p.stock_quantity > 0),
  });
}

// ─── Layout — emits Product JSON-LD then renders the client page ──────────────
export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("products")
    .select(
      "*, categories(id, name, slug, parent:categories!parent_id(name, slug)), brands(name), product_reviews(rating)"
    )
    .eq("slug", params.slug)
    .single();

  if (!p) {
    // Layout still renders — notFound() is handled by the page
    return <>{children}</>;
  }

  const reviewCount = p.product_reviews?.length || 0;
  const averageRating =
    reviewCount > 0
      ? (
          p.product_reviews!.reduce(
            (acc: number, r: any) => acc + r.rating,
            0
          ) / reviewCount
        ).toFixed(1)
      : "0";

  const productUrl = `${SITE_URL}/products/${p.slug}`;

  const breadcrumbs = [
    { name: "Home", url: SITE_URL },
    { name: "Products", url: `${SITE_URL}/products` },
    ...(p.categories?.parent?.name
      ? [
          {
            name: p.categories.parent.name,
            url: `${SITE_URL}/categories/${p.categories.parent.slug || ""}`,
          },
        ]
      : []),
    ...(p.categories?.name
      ? [
          {
            name: p.categories.name,
            url: `${SITE_URL}/categories/${p.categories.slug || ""}`,
          },
        ]
      : []),
    { name: p.name, url: productUrl },
  ];

  return (
    <>
      <JsonLd
        data={[
          productSchema({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            price: p.price,
            sale_price: p.sale_price,
            image_url: p.image_url,
            images: p.images,
            status: p.status,
            stock_quantity: p.stock_quantity,
            sku: p.sku,
            averageRating,
            reviewCount,
            brandName: (p.brands as any)?.name,
            categoryName: (p.categories as any)?.name,
          }),
          breadcrumbSchema(breadcrumbs),
          webPageSchema({
            name: p.name,
            description:
              p.description || `Buy ${p.name} at UC Enterprises`,
            url: productUrl,
            type: "Product",
          }),
        ]}
      />
      {children}
    </>
  );
}
