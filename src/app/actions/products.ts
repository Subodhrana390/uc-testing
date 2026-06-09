"use server";

import { createClient } from "@/utils/supabase/server";

export async function fetchProductsPage(
  page: number,
  searchParams: { sort?: string, category?: string, in_stock?: string, out_of_stock?: string, promo?: string, min_price?: string, max_price?: string, brand?: string }
) {
  const supabase = await createClient();
  const sortMode = searchParams.sort || "latest";
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Mapping sort modes to Supabase order
  let orderColumn = "created_at";
  let orderOptions = { ascending: false };

  if (sortMode === "price_asc") {
    orderColumn = "price";
    orderOptions = { ascending: true };
  } else if (sortMode === "price_desc") {
    orderColumn = "price";
    orderOptions = { ascending: false };
  }

  const categoryFilter = searchParams.category;
  const inStockFilter = searchParams.in_stock === "true";
  const outOfStockFilter = searchParams.out_of_stock === "true";
  const promoFilter = searchParams.promo === "true";
  const minPriceFilter = searchParams.min_price ? Number(searchParams.min_price) : null;
  const maxPriceFilter = searchParams.max_price ? Number(searchParams.max_price) : null;
  const brandFilter = searchParams.brand;

  let categoryIds: string[] = [];
  if (categoryFilter && categoryFilter !== "all") {
    const { data: targetCat } = await supabase.from("categories").select("id").eq("slug", categoryFilter).single();
    if (targetCat) {
      const { data: subCats } = await supabase.from("categories").select("id").eq("parent_id", targetCat.id);
      categoryIds = [targetCat.id, ...(subCats || []).map((c: any) => c.id)];
    }
  }

  let query = supabase.from("products")
    .select("id, name, slug, price, sale_price, image_url, status, stock_quantity, is_top_rated, created_at, categories(name, slug, parent_id, parent:categories!parent_id(name, slug)), brands!inner(name), product_reviews(rating)", { count: "exact" })
    .eq("status", "Active");

  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }
  if (inStockFilter && !outOfStockFilter) {
    query = query.gt("stock_quantity", 0);
  }
  if (outOfStockFilter && !inStockFilter) {
    query = query.eq("stock_quantity", 0);
  }
  if (promoFilter) {
    query = query.not("sale_price", "is", null);
  }
  if (minPriceFilter !== null && !isNaN(minPriceFilter)) {
    query = query.gte("price", minPriceFilter);
  }
  if (maxPriceFilter !== null && !isNaN(maxPriceFilter)) {
    query = query.lte("price", maxPriceFilter);
  }
  if (brandFilter) {
    query = query.eq("brands.name", brandFilter);
  }

  let productsData: any[] = [];
  let totalCount = 0;

  if (sortMode === "rating") {
    const { data: allProducts } = await query;
    const sorted = [...(allProducts || [])];
    sorted.sort((a, b) => {
      const aReviews = a.product_reviews || [];
      const bReviews = b.product_reviews || [];
      const aAvg = aReviews.length > 0 ? aReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / aReviews.length : 0;
      const bAvg = bReviews.length > 0 ? bReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / bReviews.length : 0;

      if (bAvg !== aAvg) return bAvg - aAvg;

      const aTop = a.is_top_rated ? 1 : 0;
      const bTop = b.is_top_rated ? 1 : 0;
      return bTop - aTop;
    });
    totalCount = sorted.length;
    productsData = sorted.slice(from, to + 1);
  } else {
    query = query.order(orderColumn, orderOptions).range(from, to);
    const { data, count: dbCount } = await query;
    productsData = data || [];
    totalCount = dbCount || 0;
  }

  return { products: productsData, totalCount };
}
