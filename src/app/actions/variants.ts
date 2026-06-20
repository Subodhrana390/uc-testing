"use server";

import { createAdminClient as createClient } from "@/utils/supabase/admin-server";

// Helper to generate cartesian product of arrays
function cartesianProduct(arrays: any[][]): any[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce(
    (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
    [[]] as any[][]
  );
}

export async function generateVariants(
  productId: string,
  attributesMatrix: Record<string, string[]>,
  basePrice: number
) {
  const supabase = await createClient();

  const { data: productData } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .single();
  const productName = productData?.name || "Product";

  const keys = Object.keys(attributesMatrix);
  const values = Object.values(attributesMatrix);

  if (keys.length === 0) return { success: false, error: "No attributes provided" };

  const combinations = cartesianProduct(values);

  const variantsToInsert = combinations.map((combo) => {
    const attributes: Record<string, string> = {};
    keys.forEach((key, index) => {
      attributes[key] = combo[index];
    });

    const skuSuffix = combo.join("-").replace(/\s+/g, "").toUpperCase();
    const sku = `PRD-${productId.split("-")[0]}-${skuSuffix}`;
    const name = productName;

    return {
      product_id: productId,
      sku: sku,
      name: name,
      price: basePrice,
      stock_quantity: 0,
      attributes: attributes,
      status: "ACTIVE",
    };
  });

  const { data, error } = await supabase
    .from("product_variants")
    .insert(variantsToInsert)
    .select();

  if (error) {
    console.error("Error generating variants:", error);
    return { success: false, error: error.message };
  }

  // Update product to indicate it has variants
  await supabase
    .from("products")
    .update({ has_variants: true })
    .eq("id", productId);

  return { success: true, data };
}

export async function bulkUpsertVariants(variants: any[]) {
  const supabase = await createClient();

  let productName = "";
  if (variants.length > 0) {
    const productId = variants[0].product_id;
    if (productId) {
      const { data: pData } = await supabase
        .from("products")
        .select("name")
        .eq("id", productId)
        .single();
      if (pData?.name) {
        productName = pData.name;
      }

      await supabase
        .from("product_variants")
        .update({ is_default: false })
        .eq("product_id", productId);
    }
  }

  const existingVariants = [];
  const newVariants = [];

  for (const v of variants) {
    // Strictly sanitize payload to ONLY include valid table columns
    // Auto-derive name from parent product name if not explicitly provided
    const derivedName = v.name ||
      productName ||
      (v.attributes && Object.keys(v.attributes).length > 0
        ? Object.values(v.attributes as Record<string, string>).join(" / ")
        : v.sku);

    const sanitized = {
      product_id: v.product_id,
      sku: v.sku,
      name: derivedName,
      barcode: v.barcode,
      price: v.price,
      sale_price: v.sale_price,
      stock_quantity: v.stock_quantity,
      reserved_stock: v.reserved_stock,
      weight: v.weight,
      dimensions: v.dimensions,
      images: v.images,
      attributes: v.attributes,
      status: v.status,
      is_default: v.is_default
    };

    // Remove undefined values to let DB use defaults if needed
    Object.keys(sanitized).forEach(key => {
      if ((sanitized as any)[key] === undefined) {
        delete (sanitized as any)[key];
      }
    });

    if (v.id) {
      existingVariants.push({ id: v.id, ...sanitized });
    } else {
      newVariants.push(sanitized);
    }
  }

  let finalData: any[] = [];

  // Update existing variants
  if (existingVariants.length > 0) {
    const { data, error } = await supabase
      .from("product_variants")
      .upsert(existingVariants, { onConflict: "id" })
      .select();

    if (error) {
      console.error("Error updating existing variants:", error);
      return { success: false, error: error.message };
    }
    if (data) finalData = [...finalData, ...data];
  }

  // Insert new variants
  if (newVariants.length > 0) {
    const { data, error } = await supabase
      .from("product_variants")
      .insert(newVariants)
      .select();

    if (error) {
      console.error("Error inserting new variants:", error);
      return { success: false, error: error.message };
    }
    if (data) finalData = [...finalData, ...data];
  }
  // Sync default variant to main product
  const defaultVariant = variants.find(v => v.is_default);
  if (defaultVariant && defaultVariant.product_id) {
    const { error: syncError } = await supabase
      .from("products")
      .update({
        sku: defaultVariant.sku,
        price: defaultVariant.price,
        sale_price: defaultVariant.sale_price || null,
        stock_quantity: defaultVariant.stock_quantity || 0,
      })
      .eq("id", defaultVariant.product_id);

    if (syncError) {
      console.error("Error syncing default variant to main product:", syncError);
    }
  }

  return { success: true, data: finalData };
}

export async function getProductVariants(productId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching variants:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function deleteVariant(variantId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) {
    console.error("Error deleting variant:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
