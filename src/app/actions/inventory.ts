"use server";

import { createAdminClient } from "@/utils/supabase/admin-server";
import { revalidatePath } from "next/cache";

export async function adjustStock({
  productId,
  variantId,
  quantity,
  reason,
  notes,
}: {
  productId: string;
  variantId?: string | null;
  quantity: number; // The absolute amount to add or subtract (can be negative)
  reason: string;
  notes?: string;
}) {
  const supabase = await createAdminClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let beforeStock = 0;
    let afterStock = 0;

    if (variantId) {
      const { data: variant, error: fetchError } = await supabase
        .from("product_variants")
        .select("stock_quantity")
        .eq("id", variantId)
        .single();
      
      if (fetchError || !variant) throw new Error("Variant not found");
      
      beforeStock = variant.stock_quantity;
      afterStock = beforeStock + quantity;

      if (afterStock < 0) throw new Error("Stock cannot be negative");

      const { error: updateError } = await supabase
        .from("product_variants")
        .update({ stock_quantity: afterStock })
        .eq("id", variantId);
      
      if (updateError) throw updateError;
    } else {
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", productId)
        .single();
      
      if (fetchError || !product) throw new Error("Product not found");

      beforeStock = product.stock_quantity;
      afterStock = beforeStock + quantity;

      if (afterStock < 0) throw new Error("Stock cannot be negative");

      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: afterStock })
        .eq("id", productId);
      
      if (updateError) throw updateError;
    }

    // Record Transaction
    const { error: txError } = await supabase.from("inventory_transactions").insert({
      product_id: productId,
      variant_id: variantId || null,
      type: "ADJUSTMENT",
      quantity: quantity,
      before_stock: beforeStock,
      after_stock: afterStock,
      reference_id: user.id,
      reference_type: "ADJUSTMENT",
      notes: `${reason} - ${notes || ''}`,
      created_by: user.id
    });

    if (txError) throw txError;

    revalidatePath("/uc-admin-portal/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("Stock adjustment failed:", err);
    return { success: false, error: err.message || "Failed to adjust stock" };
  }
}

export async function getInventoryDashboardStats() {
  const supabase = await createAdminClient();

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, stock_quantity, low_stock_threshold, price, manage_stock")
    .eq("status", "Active");

  if (productError) {
    console.error("Failed to fetch inventory stats:", productError);
    return { error: productError.message };
  }

  let totalProducts = 0;
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products?.forEach(p => {
    totalProducts++;
    totalValue += (p.stock_quantity * (p.price || 0));
    
    if (p.manage_stock) {
      if (p.stock_quantity === 0) outOfStockCount++;
      else if (p.stock_quantity <= (p.low_stock_threshold || 5)) lowStockCount++;
    }
  });

  return {
    success: true,
    data: {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount
    }
  };
}

export async function getLowStockProducts() {
  const supabase = await createAdminClient();

  // We fetch products where stock_quantity <= low_stock_threshold and manage_stock is true
  // In Supabase we can do this via RPC or by fetching and filtering if dataset is small,
  // For larger datasets, create an RPC. Here we fetch all managed products and filter.
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, sku, stock_quantity, low_stock_threshold, image_url")
    .eq("manage_stock", true)
    .eq("status", "Active");

  if (error) return { success: false, error: error.message };

  const lowStock = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5));
  
  return { success: true, data: lowStock };
}

export async function getInventoryTransactions({
  page = 1,
  pageSize = 10,
  search = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  const supabase = await createAdminClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let selectString = `
      id,
      type,
      quantity,
      before_stock,
      after_stock,
      notes,
      created_at,
      reference_id,
      reference_type,
      product_variants (name),
      created_by
    `;

    if (search) {
      selectString += `, products!inner (name)`;
    } else {
      selectString += `, products (name)`;
    }

    let queryBuilder = supabase
      .from("inventory_transactions")
      .select(selectString, { count: "exact" });

    if (search) {
      queryBuilder = queryBuilder.ilike("products.name", `%${search}%`);
    }

    const { data, count, error } = await queryBuilder
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const txList = (data as any[]) || [];

    // Fetch profile details for in-memory mapping to avoid complex/unreliable RLS/PostgREST joins
    const creatorIds = Array.from(new Set(txList.map(tx => tx.created_by).filter(Boolean)));
    const profilesMap: Record<string, { full_name: string; email: string }> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", creatorIds);
      
      const profileList = (profiles as any[]) || [];
      profileList.forEach(p => {
        profilesMap[p.id] = { full_name: p.full_name || "", email: p.email || "" };
      });
    }

    const transactionsWithProfiles = txList.map(tx => ({
      ...tx,
      creator: tx.created_by ? (profilesMap[tx.created_by] || { full_name: "System", email: "" }) : { full_name: "System", email: "" }
    }));

    return {
      success: true,
      data: transactionsWithProfiles,
      count: count || 0,
    };
  } catch (err: any) {
    console.error("Failed to fetch inventory transactions:", err);
    return { success: false, error: err.message || "Failed to fetch transactions" };
  }
}

