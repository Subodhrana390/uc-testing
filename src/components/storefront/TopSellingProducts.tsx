"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ProductCarousel from "./ProductCarousel";

export default function TopSellingProducts({ currentProductId }: { currentProductId?: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTopSelling() {
      try {
        let query = supabase
          .from("top_selling_products")
          .select(`
            id, 
            name, 
            slug, 
            price, 
            sale_price, 
            image_url, 
            status, 
            stock_quantity, 
            moq, 
            categories (id, name, slug, parent_id),
            product_reviews (rating)
          `);

        if (currentProductId) {
          query = query.neq("id", currentProductId);
        }

        const { data, error } = await query.limit(12);

        if (!error && data) {
          setProducts(data);
        } else if (error) {
          console.error("Supabase error fetching top selling products:", error);
        }
      } catch (err) {
        console.error("Error fetching top selling products:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopSelling();
  }, [currentProductId]);

  if (loading || products.length === 0) return null;

  return (
    <div className="mt-8 py-8 border-t border-zinc-100">
      <div className="mb-10 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Trending Demands</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">Top Selling Products</h2>
      </div>
      <ProductCarousel products={products} />
    </div>
  );
}
