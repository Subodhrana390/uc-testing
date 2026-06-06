"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ProductCard from "@/components/storefront/ProductCard";
import ProductCarousel from "./ProductCarousel";

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

export default function RelatedProducts({
  currentProductId,
  categoryId,
}: {
  currentProductId: string;
  categoryId: string | null;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRelated() {
      try {
        // 1. Fetch explicitly linked related products
        const { data: relations, error } = await supabase
          .from("related_products")
          .select("related:products!related_id(*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating))")
          .eq("product_id", currentProductId)
          .eq("relation_type", "related")
          .eq("related.status", "Active")
          .limit(4);

        let fetchedProducts: Product[] = [];
        if (relations && !error) {
          fetchedProducts = relations
            .map((r: any) => r.related)
            .filter(Boolean);
        }

        // 2. Fallback: If matches are fewer than 4, query other active products
        if (fetchedProducts.length < 4) {
          let fallbackQuery = supabase
            .from("products")
            .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
            .neq("id", currentProductId)
            .eq("status", "Active");

          if (categoryId) {
            fallbackQuery = fallbackQuery.eq("category_id", categoryId);
          }

          const { data: fallbacks } = await fallbackQuery.limit(10);

          if (fallbacks) {
            const matchedIds = new Set(fetchedProducts.map(p => p.id));
            const combined = [...fetchedProducts];
            for (const item of fallbacks) {
              if (combined.length >= 4) break;
              if (!matchedIds.has(item.id)) {
                combined.push(item);
                matchedIds.add(item.id);
              }
            }
            fetchedProducts = combined;
          }

          // If still less than 4, get general active products
          if (fetchedProducts.length < 4) {
            const excludeIds = [currentProductId, ...fetchedProducts.map(p => p.id)];
            const { data: generalFallbacks } = await supabase
              .from("products")
              .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
              .neq("id", currentProductId)
              .not("id", "in", `(${excludeIds.join(",")})`)
              .eq("status", "Active")
              .limit(4 - fetchedProducts.length);

            if (generalFallbacks) {
              fetchedProducts = [...fetchedProducts, ...generalFallbacks];
            }
          }
        }

        setProducts(fetchedProducts);
      } catch (err) {
        console.error("Error fetching related products:", err);
      }
    }

    fetchRelated();
  }, [currentProductId, categoryId, supabase]);

  if (products.length === 0) return null;

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <div className="mb-10 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Recommendation</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">Related Products</h2>
      </div>

      <ProductCarousel products={products} />
    </div>
  );
}
