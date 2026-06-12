import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductDetailsClient from "./ProductDetailsClient";
import ProductCarousel from "@/components/storefront/ProductCarousel";
import RecentlyViewedProducts from "@/components/storefront/RecentlyViewedProducts";
import RelatedProducts from "@/components/storefront/RelatedProducts";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  const { data: productData, error } = await supabase.rpc(
    "get_product_by_slug",
    { p_slug: params.slug }
  );

  if (!productData) {
    notFound();
  }

  // Fetch rating aggregate
  const { data: ratingData } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productData.id);

  const reviewCount = ratingData?.length || 0;
  const averageRating = reviewCount > 0
    ? ratingData!.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount
    : 0;

  const { data: attrData } = await supabase
    .from("product_attributes")
    .select(`
      value,
      attribute:attributes (
        name,
        group:attribute_groups (
          name
        )
      )
    `)
    .eq("product_id", productData.id);

  const product = {
    ...productData,
    averageRating: averageRating.toFixed(1),
    reviewCount,
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-8">
        <ProductDetailsClient product={product} attributes={attrData || []} />

        {/* Similar Products */}
        <SimilarProducts categoryId={product.category_id} currentProductId={product.id} />

        {/* Related Products */}
        <RelatedProducts categoryId={product.category_id} currentProductId={product.id} />

        {/* Recently Viewed Products */}
        <div className="border-t border-zinc-100 pt-4">
          <RecentlyViewedProducts excludeId={product.id} />
        </div>
      </div>
    </div>
  );
}

async function SimilarProducts({ categoryId, currentProductId }: { categoryId: string | null; currentProductId: string }) {
  const supabase = await createClient();
  let matchedProducts: any[] = [];

  if (categoryId) {
    const { data } = await supabase
      .from("products")
      .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
      .eq("category_id", categoryId)
      .neq("id", currentProductId)
      .eq("status", "Active")
      .limit(4);
    if (data) {
      matchedProducts = data;
    }
  }

  if (matchedProducts.length < 4) {
    const { data: fallbackData } = await supabase
      .from("products")
      .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
      .neq("id", currentProductId)
      .eq("status", "Active")
      .limit(10);

    if (fallbackData) {
      const matchedIds = new Set(matchedProducts.map(p => p.id));
      const combined = [...matchedProducts];
      for (const item of fallbackData) {
        if (combined.length >= 4) break;
        if (!matchedIds.has(item.id)) {
          combined.push(item);
          matchedIds.add(item.id);
        }
      }
      matchedProducts = combined;
    }
  }

  if (matchedProducts.length === 0) return null;

  return (
    <div className="mt-4 py-8">
      <div className="mb-10 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Related Equipment</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">Customers also viewed</h2>
      </div>
      <ProductCarousel products={matchedProducts} />
    </div>
  );
}
