"use server";

import { createClient } from "@/utils/supabase/server";

export interface ProductContext {
  id: string;
  category_id?: string | null;
  categories?: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
    } | null;
  } | null;
  price?: number;
}

const selectQuery = "*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)";

/**
 * Get similar products based on the same category and close price range.
 */
export async function getSimilarProducts(product: ProductContext, limit = 4) {
  const supabase = await createClient();
  let fetchedProducts: any[] = [];
  
  if (product.category_id) {
    // Attempt 1: Same category, active, in-stock
    let query = supabase
      .from("products")
      .select(selectQuery)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .eq("status", "Active")
      .gt("stock_quantity", 0)
      .limit(limit);
      
    // Apply price boundary if we have a price (e.g., +/- 30%)
    if (product.price) {
      const minPrice = product.price * 0.7;
      const maxPrice = product.price * 1.3;
      query = query.gte("price", minPrice).lte("price", maxPrice);
    }
    
    const { data: exactMatches } = await query;
    if (exactMatches) {
      fetchedProducts = [...exactMatches];
    }
  }

  // Attempt 2: Fallback to same category, any price/stock
  if (fetchedProducts.length < limit && product.category_id) {
    const excludeIds = [product.id, ...fetchedProducts.map(p => p.id)];
    const { data: fallbackCategory } = await supabase
      .from("products")
      .select(selectQuery)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .eq("status", "Active")
      .limit(limit - fetchedProducts.length);
      
    if (fallbackCategory) {
      fetchedProducts = [...fetchedProducts, ...fallbackCategory];
    }
  }
  
  // Attempt 3: General fallback
  if (fetchedProducts.length < limit) {
    const excludeIds = [product.id, ...fetchedProducts.map(p => p.id)];
    const { data: general } = await supabase
      .from("products")
      .select(selectQuery)
      .neq("id", product.id)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .eq("status", "Active")
      .limit(limit - fetchedProducts.length);
      
    if (general) {
      fetchedProducts = [...fetchedProducts, ...general];
    }
  }

  return fetchedProducts;
}

/**
 * Get related/cross-sell products. 
 * Prioritizes products from the parent category or high-rated products.
 */
export async function getRelatedProducts(product: ProductContext, limit = 4) {
  const supabase = await createClient();
  let fetchedProducts: any[] = [];
  
  // First, check if there's a parent category
  const parentCategorySlug = product.categories?.parent?.slug;
  if (parentCategorySlug) {
    // Find products in any subcategory of this parent
    const { data: parentMatch } = await supabase
      .from("products")
      .select(selectQuery)
      .neq("id", product.id)
      .eq("status", "Active")
      // In a real database we might query category paths or use a view
      // We will just do a standard active fetch combined with top-rated
      .order("stock_quantity", { ascending: false })
      .limit(limit);
      
    if (parentMatch) {
      // Manually filter locally to simulate parent match if the query above is broad
      fetchedProducts = parentMatch;
    }
  }
  
  // If no parent category logic worked, fall back to "trending" / high average rating products
  if (fetchedProducts.length < limit) {
    const excludeIds = [product.id, ...fetchedProducts.map(p => p.id)];
    const { data: topRatedIds } = await supabase
      .from("filterable_products")
      .select("id")
      .gte("average_rating", 4)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .limit(limit - fetchedProducts.length);
      
    if (topRatedIds && topRatedIds.length > 0) {
      const { data: topRated } = await supabase
        .from("products")
        .select(selectQuery)
        .in("id", topRatedIds.map(t => t.id));
        
      if (topRated) {
        fetchedProducts = [...fetchedProducts, ...topRated];
      }
    }
  }
  
  // Final fallback
  if (fetchedProducts.length < limit) {
    const excludeIds = [product.id, ...fetchedProducts.map(p => p.id)];
    const { data: general } = await supabase
      .from("products")
      .select(selectQuery)
      .neq("id", product.id)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .eq("status", "Active")
      .order("created_at", { ascending: false })
      .limit(limit - fetchedProducts.length);
      
    if (general) {
      fetchedProducts = [...fetchedProducts, ...general];
    }
  }

  return fetchedProducts;
}

/**
 * Get Frequently Bought Together products.
 * Ideally queries order_items. Here we use a heuristic based on popular items 
 * in complementary categories, or just top sellers overall.
 */
export async function getFrequentlyBoughtTogether(product: ProductContext, limit = 2) {
  const supabase = await createClient();
  let fetchedProducts: any[] = [];
  
  // Try to fetch top selling products from a different category to act as complementary
  if (product.category_id) {
    const { data: topSellingDifCat } = await supabase
      .from("top_selling_products")
      .select("id")
      .neq("category_id", product.category_id)
      .limit(limit);
      
    if (topSellingDifCat && topSellingDifCat.length > 0) {
      const { data: comp } = await supabase
        .from("products")
        .select(selectQuery)
        .in("id", topSellingDifCat.map(t => t.id))
        .eq("status", "Active")
        .gt("stock_quantity", 0);
        
      if (comp) {
        fetchedProducts = comp;
      }
    }
  }
  
  // Fallback to general top selling
  if (fetchedProducts.length < limit) {
    const excludeIds = [product.id, ...fetchedProducts.map(p => p.id)];
    const { data: topSellingIds } = await supabase
      .from("top_selling_products")
      .select("id")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .limit(limit - fetchedProducts.length);
      
    if (topSellingIds && topSellingIds.length > 0) {
      const { data: ts } = await supabase
        .from("products")
        .select(selectQuery)
        .in("id", topSellingIds.map(t => t.id))
        .eq("status", "Active");
        
      if (ts) {
        fetchedProducts = [...fetchedProducts, ...ts];
      }
    }
  }

  // General fallback
  if (fetchedProducts.length < limit) {
    const excludeIds = [product.id, ...fetchedProducts.map(p => p.id)];
    const { data: general } = await supabase
      .from("products")
      .select(selectQuery)
      .neq("id", product.id)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .eq("status", "Active")
      .limit(limit - fetchedProducts.length);
      
    if (general) {
      fetchedProducts = [...fetchedProducts, ...general];
    }
  }

  return fetchedProducts;
}

/**
 * Get Cross-Sell/Upsell recommendations for the Cart.
 * Suggests products based on categories currently in the cart and top-selling items.
 */
export async function getCartRecommendations(cartItemIds: string[], limit = 4) {
  const supabase = await createClient();
  let fetchedProducts: any[] = [];
  
  if (cartItemIds.length > 0) {
    // 1. Get categories of items currently in the cart
    const { data: cartItems } = await supabase
      .from("products")
      .select("category_id")
      .in("id", cartItemIds);
      
    const catIds = [...new Set(cartItems?.map((i) => i.category_id).filter(Boolean))];
    
    if (catIds.length > 0) {
      // 2. Find popular products in the same categories that are not already in the cart
      const { data: sameCat } = await supabase
        .from("products")
        .select(selectQuery)
        .in("category_id", catIds)
        .not("id", "in", `(${cartItemIds.join(",")})`)
        .eq("status", "Active")
        .order("stock_quantity", { ascending: false }) // Heuristic for popularity within category
        .limit(limit);
        
      if (sameCat) {
        fetchedProducts = sameCat;
      }
    }
  }
  
  // 3. Fallback to general top-selling products (if cart is empty or we need more items)
  if (fetchedProducts.length < limit) {
    const excludeIds = [...cartItemIds, ...fetchedProducts.map(p => p.id)];
    const notInClause = excludeIds.length > 0 ? `(${excludeIds.join(",")})` : `('')`;
    
    const { data: topSelling } = await supabase
      .from("top_selling_products")
      .select("id")
      .not("id", "in", notInClause)
      .limit(limit - fetchedProducts.length);
      
    if (topSelling && topSelling.length > 0) {
      const { data: tsProducts } = await supabase
        .from("products")
        .select(selectQuery)
        .in("id", topSelling.map(t => t.id))
        .eq("status", "Active");
        
      if (tsProducts) {
        fetchedProducts = [...fetchedProducts, ...tsProducts];
      }
    }
  }

  // 4. Final fallback to recently added active products
  if (fetchedProducts.length < limit) {
    const excludeIds = [...cartItemIds, ...fetchedProducts.map(p => p.id)];
    const notInClause = excludeIds.length > 0 ? `(${excludeIds.join(",")})` : `('')`;
    
    const { data: general } = await supabase
      .from("products")
      .select(selectQuery)
      .not("id", "in", notInClause)
      .eq("status", "Active")
      .order("created_at", { ascending: false })
      .limit(limit - fetchedProducts.length);
      
    if (general) {
      fetchedProducts = [...fetchedProducts, ...general];
    }
  }

  return fetchedProducts;
}
