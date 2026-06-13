"use server";

import { createClient } from "@/utils/supabase/server";

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  status: string;
  stock_quantity: number;
  categories?: any[];
  product_reviews?: any[];
  discountPercentage?: number;
  savings?: number;
  priceNum?: number;
  salePriceNum?: number;
}

export interface DynamicSection {
  id: string;
  title: string;
  tag: string;
  href: string;
  products: ProductSummary[];
}

/**
 * Common base query for selecting products with categories and reviews
 */
const selectQuery = "id, name, slug, price, sale_price, image_url, status, stock_quantity, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)";

/**
 * Fetch products dynamically for various sections ensuring no duplicates across segments.
 */
export async function getDynamicSections() {
  const supabase = await createClient();
  const excludeIds = new Set<string>();
  const sections: DynamicSection[] = [];
  
  // 1. Fetch Flash Deals (Calculated based on actual discount)
  let flashDeals: ProductSummary[] = [];
  try {
    const { data: allActive } = await supabase
      .from("products")
      .select(selectQuery)
      .eq("status", "Active")
      .not("sale_price", "is", null);

    if (allActive) {
      flashDeals = allActive
        .filter(p => {
          const pPrice = Number(p.price) || 0;
          const pSalePrice = Number(p.sale_price) || 0;
          return pPrice > 0 && pSalePrice > 0 && pSalePrice < pPrice;
        })
        .map(p => {
          const pPrice = Number(p.price) || 0;
          const pSalePrice = Number(p.sale_price) || 0;
          const discountPercentage = Math.round(((pPrice - pSalePrice) / pPrice) * 100);
          const savings = pPrice - pSalePrice;
          return {
            ...p,
            discountPercentage,
            savings,
            priceNum: pPrice,
            salePriceNum: pSalePrice,
          } as ProductSummary;
        })
        .sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0))
        .slice(0, 12);
        
      flashDeals.forEach(p => excludeIds.add(p.id));
    }
  } catch (e) {
    console.error("Error fetching flash deals:", e);
  }

  // 2. Fetch Top Selling Products
  let topSelling: ProductSummary[] = [];
  try {
    const { data } = await supabase
      .from("top_selling_products")
      .select(selectQuery)
      .limit(20);
      
    if (data) {
      topSelling = data.filter(p => !excludeIds.has(p.id)).slice(0, 12);
      topSelling.forEach(p => excludeIds.add(p.id));
    }
  } catch (e) {
    console.error("Error fetching top selling:", e);
  }
  
  // 3. Fetch New Arrivals (Latest active products)
  let newArrivals: ProductSummary[] = [];
  try {
    let query = supabase
      .from("products")
      .select(selectQuery)
      .eq("status", "Active")
      .order("created_at", { ascending: false })
      .limit(30);
      
    const { data } = await query;
    if (data) {
      newArrivals = data.filter(p => !excludeIds.has(p.id)).slice(0, 12);
      newArrivals.forEach(p => excludeIds.add(p.id));
    }
  } catch (e) {
    console.error("Error fetching new arrivals:", e);
  }

  // 4. Fetch Top Rated (Fallback to Trending / Random High rating)
  // Since we might not have a reliable aggregate view, we'll try fetching from filterable_products or fallback
  let trending: ProductSummary[] = [];
  try {
    const { data } = await supabase
      .from("filterable_products")
      .select("id")
      .gte("average_rating", 4)
      .limit(30);
      
    if (data && data.length > 0) {
      const trendingIds = data.map(d => d.id).filter(id => !excludeIds.has(id)).slice(0, 12);
      if (trendingIds.length > 0) {
        const { data: trendingFull } = await supabase
          .from("products")
          .select(selectQuery)
          .in("id", trendingIds);
          
        if (trendingFull) {
          trending = trendingFull;
          trending.forEach(p => excludeIds.add(p.id));
        }
      }
    }
  } catch (e) {
    console.error("Error fetching trending:", e);
  }
  
  // 5. In Stock / Recommended (Catch all high inventory)
  let recommended: ProductSummary[] = [];
  try {
    const { data } = await supabase
      .from("products")
      .select(selectQuery)
      .eq("status", "Active")
      .gt("stock_quantity", 50)
      .order("stock_quantity", { ascending: false })
      .limit(30);
      
    if (data) {
      recommended = data.filter(p => !excludeIds.has(p.id)).slice(0, 12);
      // No need to add to excludeIds since it's the last section, but good practice
      recommended.forEach(p => excludeIds.add(p.id));
    }
  } catch (e) {
    console.error("Error fetching recommended:", e);
  }

  // Assemble sections
  if (topSelling.length > 0) {
    sections.push({
      id: "top-selling",
      title: "Top Selling Products",
      tag: "Trending Demands",
      href: "/products?sort=popular", // or however sorting works
      products: topSelling
    });
  }
  
  if (newArrivals.length > 0) {
    sections.push({
      id: "new-arrivals",
      title: "New Arrivals",
      tag: "Fresh",
      href: "/products?sort=latest",
      products: newArrivals
    });
  }
  
  if (trending.length > 0) {
    sections.push({
      id: "trending",
      title: "Trending & Top Rated",
      tag: "Market Trend",
      href: "/products?rating=4",
      products: trending
    });
  }
  
  if (recommended.length > 0) {
    sections.push({
      id: "recommended",
      title: "Recommended Inventory",
      tag: "In Stock",
      href: "/products?in_stock=true",
      products: recommended
    });
  }

  return {
    flashDeals,
    sections,
  };
}
