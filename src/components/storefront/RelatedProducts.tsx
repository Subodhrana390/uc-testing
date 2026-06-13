import ProductCarousel from "./ProductCarousel";
import { getRelatedProducts } from "@/app/actions/recommendationEngine";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  images: string[];
  category_id?: string | null;
  categories?: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
    } | null;
  } | null;
  product_reviews?: {
    rating: number;
  }[];
}

export default async function RelatedProducts({
  currentProductId,
  categoryId,
}: {
  currentProductId: string;
  categoryId: string | null;
}) {
  const products = await getRelatedProducts({
    id: currentProductId,
    category_id: categoryId,
  });

  if (!products || products.length === 0) return null;

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <div className="mb-10 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Recommendation</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">Related Products</h2>
      </div>

      <ProductCarousel products={products as any} />
    </div>
  );
}
