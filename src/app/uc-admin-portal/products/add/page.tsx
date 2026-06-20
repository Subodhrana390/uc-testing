"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { ArrowLeft, Save, Loader2, Search, Plus, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import MultiImageUpload from "@/components/admin/MultiImageUpload";
import FileUpload from "@/components/admin/FileUpload";

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-md border" />
});

export default function AddProductPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("description");

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

  const [brands, setBrands] = useState<any[]>([]);
  const [dynamicAttributes, setDynamicAttributes] = useState<any[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState("");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");

  const igstRateVal = parseFloat(formData.igst_rate) || 0;
  const priceVal = parseFloat(formData.price) || 0;
  const costPriceVal = parseFloat(formData.cost_price) || 0;
  const salePriceVal = formData.sale_price ? parseFloat(formData.sale_price) : null;
  const finalPrice = priceVal + (priceVal * igstRateVal) / 100;
  const finalSalePrice = salePriceVal ? (salePriceVal + (salePriceVal * igstRateVal) / 100) : 0;

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

  useEffect(() => {
    async function fetchData() {
      const [catsRes, brandsRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("brands").select("*").order("name")
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
    }
    fetchData();
  }, [supabase]);

  useEffect(() => {
    async function fetchAttributes() {
      if (!formData.category_id) {
        setDynamicAttributes([]);
        return;
      }

      const { data, error } = await supabase
        .from("attributes")
        .select(`
          *,
          group:attribute_groups!inner(*)
        `)
        .eq("attribute_groups.category_id", formData.category_id)
        .order("display_order");

      if (error) {
        console.error("Error fetching attributes:", error);
        return;
      }

      setDynamicAttributes(data || []);
    }
    fetchAttributes();
  }, [formData.category_id, supabase]);

  const handleEditorChange = (field: string, content: string) => {
    setFormData((prev) => ({ ...prev, [field]: content }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error("Please fill in all required fields (Name, Price, Category).");
      return;
    }

    if (formData.hsn_code) {
      const hsnClean = formData.hsn_code.trim();
      if (!/^\d{4,8}$/.test(hsnClean)) {
        toast.error("HSN Code must be between 4 and 8 digits.");
        return;
      }
    }

    const priceExclusive = parseFloat(formData.price);
    const salePriceExclusive = formData.sale_price ? parseFloat(formData.sale_price) : null;

    if (salePriceExclusive !== null && salePriceExclusive >= priceExclusive) {
      toast.error("Sale price must be less than the regular price.");
      return;
    }

    const igstRate = parseFloat(formData.igst_rate || "0");
    const priceInclusive = priceExclusive * (1 + igstRate / 100);
    const salePriceInclusive = salePriceExclusive !== null ? salePriceExclusive * (1 + igstRate / 100) : null;

    setLoading(true);
    try {
      const slug = generateSlug(formData.name);
      const { data: product, error: productError } = await supabase.from("products").insert([
        {
          name: formData.name,
          slug,
          sku: formData.sku,
          barcode: formData.barcode,
          hsn_code: formData.hsn_code || null,
          brand_id: formData.brand_id || null,
          price: priceInclusive,
          cost_price: parseFloat(formData.cost_price || "0"),
          sale_price: salePriceInclusive,
          category_id: formData.category_id,
          stock_quantity: parseInt(formData.stock_quantity),
          unit: formData.unit,
          short_description: formData.short_description,
          long_description: formData.long_description,
          specification: formData.specification,
          manufacturing_info: formData.manufacturing_info,
          warranty_info: formData.warranty_info,
          image_url: formData.images[0] || null,
          images: formData.images,
          datasheet_url: formData.datasheet_url || null,
          status: formData.visibility ? "Active" : "Draft",
          igst_rate: igstRate,
          cgst_rate: parseFloat(formData.cgst_rate || "0"),
          sgst_rate: parseFloat(formData.sgst_rate || "0"),
          is_tax_inclusive: true,
          visibility: formData.visibility,
          seo_title: formData.seo_title || null,
          seo_keywords: formData.seo_keywords || null,
          seo_description: formData.seo_description || null,
          has_variants: formData.has_variants,
        },
      ]).select().single();

      if (productError) throw productError;

      // Insert dynamic attributes
      const attrInserts = Object.entries(attributeValues).map(([attrId, val]) => ({
        product_id: product.id,
        attribute_id: attrId,
        value: val
      }));

      if (attrInserts.length > 0) {
        const { error: attrError } = await supabase.from("product_attributes").insert(attrInserts);
        if (attrError) throw attrError;
      }

      toast.success("Product created successfully!");
      router.push("/uc-admin-portal/products");
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  // Reusable Tailwind Class for Inputs
  const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'description': return 'Long Description';
      case 'key_features': return 'Key Features';
      case 'attributes': return 'Attributes';
      case 'applications': return 'Applications & Mfg';
      case 'warranty': return 'Warranty & Support';
      case 'images': return 'Product Images';
      default: return tab;
    }
  };


  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Link href="/uc-admin-portal/products" className="p-2 border rounded-md hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Add New Product</h1>
            <p className="text-gray-500 text-sm">Create a new product listing for your store.</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? "Saving..." : "Save Product"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
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
                    placeholder="e.g. Premium Wireless Headphones"
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
                    placeholder="e.g. UC-101-CHEM"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="barcode">Barcode (GTIN/EAN)</label>
                  <input
                    id="barcode"
                    className={inputClass}
                    placeholder="e.g. 1234567890123"
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
                      const catId = e.target.value;
                      setSelectedMainCategoryId(catId);
                      const mainCat = categories.find((c: any) => c.id === catId);
                      const igstRate = mainCat ? mainCat.igst_rate : 0;
                      const cgstRate = mainCat ? mainCat.cgst_rate : 0;
                      const sgstRate = mainCat ? mainCat.sgst_rate : 0;
                      setFormData({
                        ...formData,
                        category_id: catId,
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

                {/* Sub Category */}
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

                {formData.category_id && (
                  <div className="md:col-span-2 flex items-center gap-1.5 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">
                      Auto-applied Tax Rate: {(() => {
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
                    {/* If no category selected, show all; else show a separator + full list option */}
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

              <div className="space-y-2 pt-2">
                <label className={labelClass} htmlFor="short_description">Short Description</label>
                <textarea
                  id="short_description"
                  className={`${inputClass} min-h-[100px] resize-none`}
                  placeholder="e.g. A brief overview for search results and previews..."
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Pricing & Inventory Section */}
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="text-lg font-semibold">Pricing & Inventory</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
                    <p className="text-[10px] text-zinc-500 mt-1.5 font-semibold">
                      Final Price: <span className="text-zinc-900 font-extrabold">₹{finalPrice.toFixed(2)}</span> (GST Included)
                    </p>
                  )}
                </div>
                <div className="md:col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 space-y-3">
                  <label className="block text-sm font-semibold text-orange-800">Discount</label>
                  <div className="flex items-center gap-3">
                    <select
                      id="discount_type"
                      className={`${inputClass} w-36 shrink-0`}
                      value={formData.sale_price ? (discountType || "none") : "none"}
                      onChange={(e) => {
                        const type = e.target.value;
                        if (type === "none") {
                          setDiscountType("none");
                          setDiscountValue("");
                          setFormData({ ...formData, sale_price: "" });
                        } else {
                          setDiscountType(type);
                          setDiscountValue("");
                          setFormData({ ...formData, sale_price: "" });
                        }
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
                          className={inputClass}
                          placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 50"}
                          value={discountValue}
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDiscountValue(val);
                            const numVal = parseFloat(val);
                            const basePrice = parseFloat(formData.price);
                            if (!isNaN(numVal) && numVal > 0 && !isNaN(basePrice) && basePrice > 0) {
                              let calculated = 0;
                              if (discountType === "percentage") {
                                calculated = basePrice - (basePrice * numVal / 100);
                              } else {
                                calculated = basePrice - numVal;
                              }
                              calculated = Math.max(0, Math.round(calculated * 100) / 100);
                              setFormData({ ...formData, sale_price: calculated > 0 ? calculated.toString() : "" });
                            } else {
                              setFormData({ ...formData, sale_price: "" });
                            }
                          }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-500 pointer-events-none">
                          {discountType === "percentage" ? "%" : "₹"}
                        </span>
                      </div>
                    )}
                  </div>
                  {formData.sale_price && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-500 font-medium">Original: <span className="line-through">₹{parseFloat(formData.price).toLocaleString("en-IN")}</span></span>
                      <span className="text-emerald-700 font-extrabold">Sale Price: ₹{parseFloat(formData.sale_price).toLocaleString("en-IN")}</span>
                      {discountType === "percentage" && discountValue && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold">{discountValue}% OFF</span>
                      )}
                      {discountType === "fixed" && discountValue && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold">₹{parseFloat(discountValue).toLocaleString("en-IN")} OFF</span>
                      )}
                      {formData.sale_price && igstRateVal > 0 && (
                        <span className="text-zinc-500 font-semibold">
                          Final: <span className="text-zinc-900 font-extrabold">₹{finalSalePrice.toFixed(2)}</span> (incl. GST)
                        </span>
                      )}
                    </div>
                  )}
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
                  <label id="tax_inclusive" className="flex items-center justify-center gap-2 cursor-not-allowed h-10 text-sm text-gray-400 bg-gray-100 border border-gray-200 px-3 rounded-md transition-colors w-full">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      onChange={() => {}}
                      className="w-4 h-4 text-primary focus:ring-primary rounded border-gray-300 cursor-not-allowed"
                    />
                    <span className="font-semibold">Inclusive in Store</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className={labelClass} htmlFor="unit">Unit (e.g. pcs, kg, ltr)</label>
                  <input
                    id="unit"
                    className={inputClass}
                    placeholder="pcs"
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
              {['description', 'key_features', 'attributes', 'applications', 'warranty', 'images'].map((tab) => (
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

        {/* Sidebar Column */}
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
                <span className="text-sm font-medium">Publish Status</span>
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
    </div>
  );
}