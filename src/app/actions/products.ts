"use server";
 
import { createClient } from "@/utils/supabase/server";

export interface FilterParams {
  q?: string;
  sort?: string;
  category?: string;
  in_stock?: string;
  out_of_stock?: string;
  promo?: string;
  min_price?: string;
  max_price?: string;
  brand?: string;
  rating?: string;
  [key: string]: string | string[] | undefined;
}

/**
 * Highly optimized, server-side database query helper to search and filter products.
 * Queries against the `filterable_products` view for optimal performance.
 */
export async function fetchProductsFiltered(
  page: number,
  searchParams: FilterParams
) {
  const supabase = await createClient();
  const sortMode = searchParams.sort || "latest";
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Initialize query on the filterable_products view
  let query = supabase
    .from("filterable_products")
    .select("*", { count: "exact" })
    .eq("status", "Active");

  // 1. Search Query
  if (searchParams.q && searchParams.q.trim() !== "") {
    const searchTerm = searchParams.q.trim();
    query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  // 2. Category / Subcategory drilldown
  if (searchParams.category && searchParams.category !== "all") {
    query = query.or(`category_slug.eq.${searchParams.category},parent_category_slug.eq.${searchParams.category}`);
  }

  // 3. Brand (supports single or comma-separated multiple brands)
  if (searchParams.brand && searchParams.brand.trim() !== "") {
    const brands = searchParams.brand.split(",").map(b => b.trim()).filter(Boolean);
    if (brands.length > 0) {
      query = query.in("brand_name", brands);
    }
  }

  // 4. Price range (compares against dynamically computed active_price)
  if (searchParams.min_price) {
    const minPrice = Number(searchParams.min_price);
    if (!isNaN(minPrice)) {
      query = query.gte("active_price", minPrice);
    }
  }
  if (searchParams.max_price) {
    const maxPrice = Number(searchParams.max_price);
    if (!isNaN(maxPrice)) {
      query = query.lte("active_price", maxPrice);
    }
  }

  // 5. Availability (stock and promo filters)
  const inStockFilter = searchParams.in_stock === "true";
  const outOfStockFilter = searchParams.out_of_stock === "true";
  
  if (inStockFilter && !outOfStockFilter) {
    query = query.gt("stock_quantity", 0);
  }
  if (outOfStockFilter && !inStockFilter) {
    query = query.eq("stock_quantity", 0);
  }
  if (searchParams.promo === "true") {
    query = query.not("sale_price", "is", null);
  }

  // 6. Rating (compares against computed average_rating)
  if (searchParams.rating) {
    const minRating = Number(searchParams.rating);
    if (!isNaN(minRating)) {
      query = query.gte("average_rating", minRating);
    }
  }

  // 7. Custom attribute filters (e.g. attr_<id>=value1,value2)
  Object.entries(searchParams).forEach(([key, val]) => {
    if (key.startsWith("attr_") && val) {
      const attrId = key.replace("attr_", "");
      const attrValues = typeof val === "string" 
        ? val.split(",").map(v => v.trim()).filter(Boolean) 
        : Array.isArray(val) ? val : [];

      if (attrValues.length > 0) {
        query = query.in(`attributes->>${attrId}`, attrValues);
      }
    }
  });

  // 8. Sorting
  if (sortMode === "price_asc") {
    query = query.order("active_price", { ascending: true });
  } else if (sortMode === "price_desc") {
    query = query.order("active_price", { ascending: false });
  } else if (sortMode === "rating") {
    query = query
      .order("average_rating", { ascending: false })
      .order("is_top_rated", { ascending: false });
  } else {
    // Default: Newest Arrivals
    query = query.order("created_at", { ascending: false });
  }

  // 9. Pagination Range
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching filtered products:", error);
    return { products: [], totalCount: 0 };
  }

  return {
    products: data || [],
    totalCount: count || 0
  };
}

/**
 * Backwards compatible fetch page action.
 */
export async function fetchProductsPage(
  page: number,
  searchParams: Record<string, string>
) {
  return fetchProductsFiltered(page, searchParams);
}
