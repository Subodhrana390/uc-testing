import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductDetailsClient from "./ProductDetailsClient";
import ProductCarousel from "@/components/storefront/ProductCarousel";
import RecentlyViewedProducts from "@/components/storefront/RecentlyViewedProducts";
import RelatedProducts from "@/components/storefront/RelatedProducts";
import FrequentlyBoughtTogether from "@/components/storefront/FrequentlyBoughtTogether";
import { getSiteSettings } from "@/app/actions/settings";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const settings = await getSiteSettings();
  const frequentlyBoughtTogetherEnabled = settings?.frequently_bought_together_enabled ?? true;

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
    .eq("product_id", productData.id)
    .eq("is_hidden", false);

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

  const { data: variantsData } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productData.id)
    .eq("status", "ACTIVE")
    .order("is_default", { ascending: false });

  const product = {
    ...productData,
    averageRating: averageRating.toFixed(1),
    reviewCount,
    variants: variantsData || [],
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-8">
        <ProductDetailsClient 
          product={product} 
          attributes={attrData || []} 
          frequentlyBoughtTogetherEnabled={frequentlyBoughtTogetherEnabled}
        />

        {/* Frequently Bought Together */}
        {frequentlyBoughtTogetherEnabled && (
          <FrequentlyBoughtTogether currentProduct={product} />
        )}

        {/* Similar Products */}
        <SimilarProducts categoryId={product.category_id} currentProductId={product.id} price={product.price} />

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

async function SimilarProducts({ categoryId, currentProductId, price }: { categoryId: string | null; currentProductId: string; price?: number }) {
  const { getSimilarProducts } = await import("@/app/actions/recommendationEngine");
  
  const matchedProducts = await getSimilarProducts({
    id: currentProductId,
    category_id: categoryId,
    price: price,
  });

  if (!matchedProducts || matchedProducts.length === 0) return null;

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
