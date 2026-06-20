"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { ArrowLeft, Save, Loader2, Plus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import MultiImageUpload from "@/components/admin/MultiImageUpload";
import FileUpload from "@/components/admin/FileUpload";
import LogoLoader from "@/components/ui/LogoLoader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-md border" />
});

import ProductVariantsManager from "../ProductVariantsManager";

export default function EditProductPage({ params }: { params: { id: string } }) {
  const productId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    cost_price: "0",
    sale_price: "",
    sku: "",
    barcode: "",
    hsn_code: "",
    brand_id: "",
    category_id: "",
    stock_quantity: "0",
    unit: "pcs",
    short_description: "",
    long_description: "",
    specification: "",
    manufacturing_info: "",
    warranty_info: "",
    images: [] as string[],
    igst_rate: "0",
    cgst_rate: "0",
    sgst_rate: "0",
    is_industrial_grade: false,
    is_ready_stock: false,
    is_tax_inclusive: false,
    datasheet_url: "",
    visibility: true,
    seo_title: "",
    seo_keywords: "",
    seo_description: "",
    has_variants: false,
  });

  const [dynamicAttributes, setDynamicAttributes] = useState<any[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState("");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");

  const igstRateVal = parseFloat(formData.igst_rate) || 0;
  const priceVal = parseFloat(formData.price) || 0;
  const salePriceVal = parseFloat(formData.sale_price) || 0;

  const finalPrice = priceVal + (priceVal * igstRateVal) / 100;
  const finalSalePrice = salePriceVal ? (salePriceVal + (salePriceVal * igstRateVal) / 100) : 0;

  const { data: initialData, isLoading: loading } = useQuery({
    queryKey: ["admin-product-edit", productId],
    queryFn: async () => {
      const [
        { data: product },
        { data: catsRes },
        { data: brandsRes },
        { data: attrValuesRes }
      ] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),
        supabase.from("categories").select("*").order("name"),
        supabase.from("brands").select("*").order("name"),
        supabase.from("product_attributes").select("*").eq("product_id", productId)
      ]);

      return { product, categories: catsRes || [], brands: brandsRes || [], attributes: attrValuesRes || [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories = initialData?.categories || [];
  const brands = initialData?.brands || [];

  // Map main category name keywords → brand category text values
  const getBrandCategoryKeywords = (mainCatName: string): string[] => {
    const n = mainCatName.toLowerCase();
    if (n.includes("chemical")) return ["chemical", "plasticware", "glassware"];
    if (n.includes("glassware") || n.includes("plasticware")) return ["glassware", "plasticware", "chemical"];
    if (n.includes("safety") || n.includes("ppe")) return ["safety", "ppe"];
    if (n.includes("tool") || n.includes("hardware")) return ["tool", "hardware"];
    if (n.includes("industrial") || n.includes("electrical")) return ["instrument", "equipment", "electrical"];
    return [];
  };

  const filteredBrands = (() => {
    if (!selectedMainCategoryId) return brands;
    const mainCat = categories.find((c: any) => c.id === selectedMainCategoryId);
    if (!mainCat) return brands;
    const keywords = getBrandCategoryKeywords(mainCat.name);
    if (keywords.length === 0) return brands;
    return brands.filter((b: any) =>
      keywords.some(kw => (b.category || "").toLowerCase().includes(kw))
    );
  })();

  // Update local state when initial data loads
  useEffect(() => {
    if (initialData?.product) {
      const { product, categories: catsRes, attributes } = initialData;

      const productCatId = product.category_id || "";
      const productCat = catsRes?.find((c: any) => c.id === productCatId);
      if (productCat?.parent_id) {
        setSelectedMainCategoryId(productCat.parent_id);
      } else if (productCatId) {
        setSelectedMainCategoryId(productCatId);
      }

      const rate = product.igst_rate || 0;
      const isInclusive = product.is_tax_inclusive || false;
      const roundPrice = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
      const basePrice = isInclusive ? roundPrice(product.price / (1 + rate / 100)) : product.price;
      const baseSalePrice = product.sale_price
        ? (isInclusive ? roundPrice(product.sale_price / (1 + rate / 100)) : product.sale_price)
        : "";

      setFormData({
        name: product.name,
        price: basePrice.toString(),
        cost_price: (product.cost_price || 0).toString(),
        sale_price: baseSalePrice.toString(),
        sku: product.sku || "",
        barcode: product.barcode || "",
        hsn_code: product.hsn_code || "",
        brand_id: product.brand_id || "",
        category_id: product.category_id || "",
        stock_quantity: (product.stock_quantity || 0).toString(),
        unit: product.unit || "pcs",
        short_description: product.short_description || "",
        long_description: product.long_description || "",
        specification: product.specification || "",
        manufacturing_info: product.manufacturing_info || "",
        warranty_info: product.warranty_info || "",
        images: product.images || [],
        igst_rate: (product.igst_rate || 0).toString(),
        cgst_rate: (product.cgst_rate || 0).toString(),
        sgst_rate: (product.sgst_rate || 0).toString(),
        is_industrial_grade: product.is_industrial_grade || false,
        is_ready_stock: product.is_ready_stock || false,
        is_tax_inclusive: product.is_tax_inclusive || false,
        datasheet_url: product.datasheet_url || "",
        visibility: product.visibility !== false,
        seo_title: product.seo_title || "",
        seo_keywords: product.seo_keywords || "",
        seo_description: product.seo_description || "",
        has_variants: product.has_variants || false,
      });

      if (attributes && attributes.length > 0) {
        const values: Record<string, any> = {};
        attributes.forEach((attr: any) => {
          values[attr.attribute_id] = attr.attribute_value;
        });
        setAttributeValues(values);
      }

      // Reverse-calculate discount if sale_price exists
      if (baseSalePrice && basePrice > 0) {
        const sp = parseFloat(baseSalePrice.toString());
        if (!isNaN(sp) && sp > 0 && sp < basePrice) {
          const pctOff = ((basePrice - sp) / basePrice) * 100;
          const rounded = Math.round(pctOff * 100) / 100;
          setDiscountType("percentage");
          setDiscountValue(rounded.toString());
        }
      }
    }
  }, [initialData]);


  const { data: catAttributesData } = useQuery({
    queryKey: ["admin-product-category-attributes", formData.category_id],
    queryFn: async () => {
      if (!formData.category_id) return [];
      const { data, error } = await supabase
        .from("category_attributes")
        .select("attributes(*)")
        .eq("category_id", formData.category_id);
      if (error) throw error;
      return data.map(d => d.attributes).filter(Boolean);
    },
    enabled: !!formData.category_id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (catAttributesData) {
      setDynamicAttributes(catAttributesData);
    }
  }, [catAttributesData]);

  const updateProductMutation = useMutation({
    mutationFn: async () => {
      const priceExclusive = parseFloat(formData.price) || 0;
      const salePriceExclusive = formData.sale_price ? parseFloat(formData.sale_price) : null;
      const igstRate = parseFloat(formData.igst_rate) || 0;
      const cgstRate = parseFloat(formData.cgst_rate) || 0;
      const sgstRate = parseFloat(formData.sgst_rate) || 0;
      const priceInclusive = priceExclusive * (1 + igstRate / 100);
      const salePriceInclusive = salePriceExclusive !== null ? salePriceExclusive * (1 + igstRate / 100) : null;

      const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const slug = generateSlug(formData.name.trim());

      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name.trim(),
          slug,
          price: priceInclusive,
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
          sale_price: salePriceInclusive,
          sku: formData.sku.trim(),
          barcode: formData.barcode.trim(),
          hsn_code: formData.hsn_code.trim(),
          brand_id: formData.brand_id || null,
          category_id: formData.category_id || null,
          stock_quantity: parseInt(formData.stock_quantity),
          unit: formData.unit,
          short_description: formData.short_description.trim(),
          long_description: formData.long_description.trim(),
          specification: formData.specification.trim(),
          manufacturing_info: formData.manufacturing_info.trim(),
          warranty_info: formData.warranty_info.trim(),
          image_url: formData.images[0] || null,
          images: formData.images,
          status: formData.visibility ? "Active" : "Draft",
          igst_rate: igstRate,
          cgst_rate: cgstRate,
          sgst_rate: sgstRate,
          is_tax_inclusive: true,
          datasheet_url: formData.datasheet_url,
          visibility: formData.visibility,
          seo_title: formData.seo_title,
          seo_keywords: formData.seo_keywords,
          seo_description: formData.seo_description,
          has_variants: formData.has_variants,
        })
        .eq("id", productId);

      if (error) throw error;

      if (formData.has_variants) {
        await supabase
          .from("product_variants")
          .update({
            price: priceInclusive,
            sale_price: salePriceInclusive,
          })
          .eq("product_id", productId)
          .eq("is_default", true);
      }

      await supabase.from("product_attributes").delete().eq("product_id", productId);
      const attrInserts = Object.entries(attributeValues)
        .filter(([_, val]) => val !== "" && val !== null)
        .map(([attrId, val]) => ({
          product_id: productId,
          attribute_id: attrId,
          attribute_value: val
        }));
      if (attrInserts.length > 0) {
        await supabase.from("product_attributes").insert(attrInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-edit", productId] });
      queryClient.invalidateQueries({ queryKey: ["admin-products-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products-table"] });
      toast.success("Product updated successfully!");
      router.push("/uc-admin-portal/products");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update product");
    },
    onSettled: () => {
      setSaving(false);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products-table"] });
      toast.success("Product deleted successfully");
      router.push("/uc-admin-portal/products");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product");
    },
    onSettled: () => {
      setDeleting(false);
    }
  });


  const handleEditorChange = (field: string, content: string) => {
    setFormData((prev) => ({ ...prev, [field]: content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.category_id) {
      toast.error("Please fill in all required fields (Name, Price, Category)");
      return;
    }
    if (formData.hsn_code) {
      const hsnClean = formData.hsn_code.trim();
      if (!/^\d{4,8}$/.test(hsnClean)) {
        toast.error("HSN Code must be between 4 and 8 digits.");
        return;
      }
    }
    setSaving(true);
    updateProductMutation.mutate();
  };

  const handleDelete = async () => {
    setDeleting(true);
    deleteProductMutation.mutate();
  };

  const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'description': return 'Long Description';
      case 'key_features': return 'Key Features';
      case 'attributes': return 'Attributes';
      case 'variants': return 'Variants';
      case 'applications': return 'Applications & Manufacturing';
      case 'warranty': return 'Warranty & Support';
      case 'images': return 'Product Images';
      default: return tab;
    }
  };

  if (loading) {
    return <LogoLoader text="Loading product details..." minHeight="400px" />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Link href="/uc-admin-portal/products" className="p-2 border rounded-md hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-gray-500 text-sm">Update product specifications, inventory and visibility.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-red-100 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Updating..." : "Update Product"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info Section */}
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="text-lg font-semibold">Basic Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="product_type">Product Type</label>
                  <select
                    id="product_type"
                    className={inputClass}
                    value={formData.has_variants ? "variable" : "simple"}
                    onChange={(e) => setFormData({ ...formData, has_variants: e.target.value === "variable" })}
                  >
                    <option value="simple">Simple Product (No Variants)</option>
                    <option value="variable">Variable Product (Has Variants)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="name">Product Name *</label>
                  <input
                    id="name"
                    className={inputClass}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="sku">SKU / Product Code</label>
                  <input
                    id="sku"
                    className={inputClass}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="barcode">Barcode (GTIN/EAN)</label>
                  <input
                    id="barcode"
                    className={inputClass}
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="hsn_code">HSN Code (GST)</label>
                  <input
                    id="hsn_code"
                    className={inputClass}
                    placeholder="e.g. 8501"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Category */}
                <div>
                  <label className={labelClass} htmlFor="main_category">Main Category *</label>
                  <select
                    id="main_category"
                    className={inputClass}
                    value={selectedMainCategoryId}
                    onChange={(e) => {
                      const mainId = e.target.value;
                      setSelectedMainCategoryId(mainId);
                      // Reset sub-category when main changes
                      const mainCat = categories.find((c: any) => c.id === mainId);
                      const igstRate = mainCat ? mainCat.igst_rate : 0;
                      const cgstRate = mainCat ? mainCat.cgst_rate : 0;
                      const sgstRate = mainCat ? mainCat.sgst_rate : 0;
                      setFormData({
                        ...formData,
                        category_id: mainId,
                        brand_id: "",
                        igst_rate: mainCat ? igstRate.toString() : formData.igst_rate,
                        cgst_rate: mainCat ? cgstRate.toString() : formData.cgst_rate,
                        sgst_rate: mainCat ? sgstRate.toString() : formData.sgst_rate,
                        is_tax_inclusive: igstRate > 0
                      });
                    }}
                    required
                  >
                    <option value="">Select Main Category</option>
                    {categories.filter((c: any) => !c.parent_id).map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sub Category — only shown if main has children */}
                {selectedMainCategoryId && categories.some((c: any) => c.parent_id === selectedMainCategoryId) && (
                  <div>
                    <label className={labelClass} htmlFor="sub_category">Sub Category</label>
                    <select
                      id="sub_category"
                      className={inputClass}
                      value={categories.find((c: any) => c.id === formData.category_id)?.parent_id === selectedMainCategoryId ? formData.category_id : ""}
                      onChange={(e) => {
                        const catId = e.target.value;
                        if (!catId) {
                          const mainCat = categories.find((c: any) => c.id === selectedMainCategoryId);
                          setFormData({
                            ...formData,
                            category_id: selectedMainCategoryId,
                            igst_rate: mainCat ? mainCat.igst_rate?.toString() || "0" : formData.igst_rate,
                            cgst_rate: mainCat ? mainCat.cgst_rate?.toString() || "0" : formData.cgst_rate,
                            sgst_rate: mainCat ? mainCat.sgst_rate?.toString() || "0" : formData.sgst_rate,
                            is_tax_inclusive: mainCat ? (mainCat.igst_rate > 0) : formData.is_tax_inclusive
                          });
                        } else {
                          const subCat = categories.find((c: any) => c.id === catId);
                          const mainCat = subCat ? categories.find((c: any) => c.id === subCat.parent_id) : categories.find((c: any) => c.id === selectedMainCategoryId);
                          setFormData({
                            ...formData,
                            category_id: catId,
                            igst_rate: mainCat ? mainCat.igst_rate?.toString() || "0" : formData.igst_rate,
                            cgst_rate: mainCat ? mainCat.cgst_rate?.toString() || "0" : formData.cgst_rate,
                            sgst_rate: mainCat ? mainCat.sgst_rate?.toString() || "0" : formData.sgst_rate,
                            is_tax_inclusive: mainCat ? (mainCat.igst_rate > 0) : formData.is_tax_inclusive
                          });
                        }
                      }}
                    >
                      <option value="">(All of {categories.find((c: any) => c.id === selectedMainCategoryId)?.name})</option>
                      {categories.filter((c: any) => c.parent_id === selectedMainCategoryId).map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tax rate info */}
                {formData.category_id && (
                  <div className="md:col-span-2 flex items-center gap-1.5 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">
                      Auto-applied IGST Rate: {(() => {
                        if (!formData.category_id) return 0;
                        const cat = categories.find((c: any) => c.id === formData.category_id);
                        if (!cat) return 0;
                        if (cat.igst_rate !== null && cat.igst_rate !== undefined && cat.igst_rate !== 0) return cat.igst_rate;
                        if (cat.parent_id) {
                          const parentCat = categories.find((c: any) => c.id === cat.parent_id);
                          return parentCat?.igst_rate || 0;
                        }
                        return 0;
                      })()}%
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="brand">
                    Brand{selectedMainCategoryId && filteredBrands.length < brands.length && (
                      <span className="ml-1.5 text-[10px] font-bold text-primary uppercase tracking-widest">
                        ({filteredBrands.length} for this category)
                      </span>
                    )}
                  </label>
                  <select
                    id="brand"
                    className={inputClass}
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                  >
                    <option value="">Select Brand</option>
                    {filteredBrands.map((brand: any) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                    {selectedMainCategoryId && filteredBrands.length < brands.length && (
                      <>
                        <option disabled>── Other Brands ──</option>
                        {brands.filter((b: any) => !filteredBrands.find((fb: any) => fb.id === b.id)).map((brand: any) => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="short_description">Short Description</label>
                <textarea
                  id="short_description"
                  className={`${inputClass} min-h-[80px] resize-none`}
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Pricing & Inventory Section */}
          <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-base font-semibold text-zinc-900">Pricing & Inventory</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Grid Segment 1: Financials & Discounts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Direct Pricing (Spans 7/12) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="cost_price">Cost Price (₹)</label>
                    <input
                      id="cost_price"
                      type="number"
                      className={inputClass}
                      placeholder="0.00"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="price">Sales Price (₹) *</label>
                    <div className="space-y-1.5">
                      <input
                        id="price"
                        type="number"
                        className={inputClass}
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        required
                      />
                      {formData.price && igstRateVal > 0 && (
                        <p className="text-[11px] text-zinc-500 font-medium px-0.5">
                          Final Price: <span className="text-zinc-900 font-bold">₹{finalPrice.toFixed(2)}</span> <span className="text-zinc-400 font-normal">(GST Incl.)</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* GST */}
                  <div>
                    <label className={labelClass}>GST Configuration</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-500">IGST</span>
                        <div className="flex items-center h-[42px] px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                          <span className="text-sm font-semibold">{formData.igst_rate}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-500">CGST</span>
                        <div className="flex items-center h-[42px] px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                          <span className="text-sm font-semibold">{formData.cgst_rate}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-500">SGST</span>
                        <div className="flex items-center h-[42px] px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                          <span className="text-sm font-semibold">{formData.sgst_rate}%</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">Rates are inherited from the Main Category</p>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="tax_inclusive">Tax Type</label>
                    <div className="flex items-center gap-2 h-[42px] px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-400 select-none cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        readOnly
                        className="w-4 h-4 text-zinc-400 rounded border-zinc-300 pointer-events-none"
                      />
                      <span className="text-sm font-medium">Inclusive in Store</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Discount Sub-card (Spans 5/12) */}
                <div className="lg:col-span-5 bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-zinc-700">Discount Configuration</label>
                    <div className="flex flex-col items-center gap-2.5">
                      <select
                        id="discount_type"
                        className={`${inputClass} w-36 bg-white shrink-0`}
                        value={discountType}
                        onChange={(e) => {
                          const type = e.target.value;
                          setDiscountType(type);
                          setDiscountValue("");
                          setFormData({ ...formData, sale_price: "" });
                        }}
                      >
                        <option value="none">No Discount</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed (₹)</option>
                      </select>

                      {discountType !== "none" && (
                        <div className="relative flex-1">
                          <input
                            id="discount_value"
                            type="number"
                            className={`${inputClass} bg-white pr-8`}
                            placeholder={discountType === "percentage" ? "10" : "50"}
                            value={discountValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDiscountValue(val);
                              const numVal = parseFloat(val);
                              const basePrice = parseFloat(formData.price);
                              if (!isNaN(numVal) && numVal > 0 && !isNaN(basePrice) && basePrice > 0) {
                                let calculated = discountType === "percentage"
                                  ? basePrice - (basePrice * numVal / 100)
                                  : basePrice - numVal;
                                calculated = Math.max(0, Math.round(calculated * 100) / 100);
                                setFormData({ ...formData, sale_price: calculated > 0 ? calculated.toString() : "" });
                              } else {
                                setFormData({ ...formData, sale_price: "" });
                              }
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                            {discountType === "percentage" ? "%" : "₹"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Breakdown Summary */}
                  {formData.sale_price && (
                    <div className="pt-3 border-t border-zinc-200/60 grid grid-cols-2 gap-2 text-xs">
                      <div className="text-zinc-500">
                        Original: <span className="line-through font-medium text-zinc-600">₹{parseFloat(formData.price).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {discountType === "percentage" ? `${discountValue}% OFF` : `₹${parseFloat(discountValue).toLocaleString("en-IN")} OFF`}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-between items-baseline mt-1 bg-white p-2 rounded-lg border border-zinc-100">
                        <span className="font-semibold text-zinc-700 text-sm">Sale Price:</span>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600 text-base">₹{parseFloat(formData.sale_price).toLocaleString("en-IN")}</span>
                          {parseFloat(formData.igst_rate) > 0 && (
                            <p className="text-[10px] text-zinc-400 font-normal">Final: ₹{((parseFloat(formData.sale_price) || 0) * (1 + (parseFloat(formData.igst_rate) || 0) / 100)).toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-zinc-100" />

              {/* Grid Segment 2: Logistics / Inventory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="stock">Stock Quantity</label>
                  <input
                    id="stock"
                    type="number"
                    className={inputClass}
                    placeholder="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="unit">Unit</label>
                  <input
                    id="unit"
                    className={inputClass}
                    placeholder="e.g. Pcs, Kgs"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Tabs Section */}
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="flex border-b bg-gray-50/50 overflow-x-auto no-scrollbar">
              {['description', 'key_features', 'attributes', 'variants', 'applications', 'warranty', 'images']
                .filter(tab => tab !== 'variants' || formData.has_variants)
                .map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize border-b-2 whitespace-nowrap transition-colors ${activeTab === tab
                    ? "border-black text-black bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {getTabLabel(tab)}
                </button>
              ))}
            </div>
            <div className="p-6">
              {activeTab === 'description' && (
                <div className="space-y-6">
                  <RichTextEditor
                    value={formData.long_description}
                    onChange={(content) => handleEditorChange("long_description", content)}
                  />
                </div>
              )}

              {activeTab === 'key_features' && (
                <div className="space-y-6">
                  <RichTextEditor
                    value={formData.specification}
                    onChange={(content) => handleEditorChange("specification", content)}
                  />
                </div>
              )}

              {activeTab === 'variants' && (
                <div className="space-y-6">
                  <ProductVariantsManager 
                    productId={productId} 
                    productName={formData.name}
                    basePrice={parseFloat(formData.price) || 0} 
                    gstRate={igstRateVal} 
                    onDefaultSync={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        price: v.price || prev.price,
                        sale_price: v.sale_price || prev.sale_price,
                        sku: v.sku || prev.sku,
                        stock_quantity: v.stock_quantity ? v.stock_quantity.toString() : prev.stock_quantity
                      }));
                    }}
                  />
                </div>
              )}

              {activeTab === 'attributes' && (
                <div className="space-y-6">
                  {dynamicAttributes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {dynamicAttributes.map((attr) => (
                        <div key={attr.id} className="space-y-2">
                          <label className={labelClass}>
                            {attr.name} {attr.is_required && <span className="text-red-500">*</span>}
                          </label>
                          {attr.type === 'dropdown' ? (
                            <select
                              className={inputClass}
                              value={attributeValues[attr.id] || ""}
                              onChange={(e) => setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })}
                            >
                              <option value="">Select {attr.name}</option>
                              {attr.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : attr.type === 'boolean' ? (
                            <div className="flex items-center gap-2 h-10">
                              <input
                                type="checkbox"
                                checked={attributeValues[attr.id] === 'true'}
                                onChange={(e) => setAttributeValues({ ...attributeValues, [attr.id]: e.target.checked.toString() })}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">Yes / No</span>
                            </div>
                          ) : (
                            <input
                              type={attr.type === 'number' ? 'number' : 'text'}
                              className={inputClass}
                              placeholder={`Enter ${attr.name.toLowerCase()}`}
                              value={attributeValues[attr.id] || ""}
                              onChange={(e) => setAttributeValues({ ...attributeValues, [attr.id]: e.target.value })}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed">
                      <p className="text-sm text-gray-500 italic">
                        {formData.category_id ? "No specialized attributes defined for this category." : "Select a category to load specific attributes."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'applications' && (
                <div className="space-y-6">
                  <RichTextEditor
                    value={formData.manufacturing_info}
                    onChange={(content) => handleEditorChange("manufacturing_info", content)}
                  />
                </div>
              )}

              {activeTab === 'warranty' && (
                <div className="space-y-6">
                  <RichTextEditor
                    value={formData.warranty_info}
                    onChange={(content) => handleEditorChange("warranty_info", content)}
                  />
                </div>
              )}

              {activeTab === 'images' && (
                <div className="space-y-6">
                  <MultiImageUpload
                    images={formData.images}
                    onChange={(images) => setFormData(prev => ({ ...prev, images }))}
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="text-lg font-semibold">Product Documents</h2>
            </div>
            <div className="p-6">
              <FileUpload
                label="Upload Datasheet (PDF)"
                value={formData.datasheet_url}
                onChange={(url) => setFormData(prev => ({ ...prev, datasheet_url: url }))}
              />
            </div>
          </section>

          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="text-lg font-semibold">Visibility</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Visible on Store</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, visibility: !formData.visibility })}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${formData.visibility ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {formData.visibility ? 'Active' : 'Hidden'}
                </button>
              </div>
            </div>
          </section>


          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="text-lg font-semibold">SEO Settings</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>SEO Title</label>
                <input
                  className={inputClass}
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>SEO Keywords</label>
                <input
                  className={inputClass}
                  placeholder="comma, separated, keywords"
                  value={formData.seo_keywords}
                  onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>SEO Meta Description</label>
                <textarea
                  className={`${inputClass} min-h-[100px]`}
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Product</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{formData.name || "this product"}</span>? This action cannot be undone and will permanently remove this item from the store.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 rounded-xl"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


