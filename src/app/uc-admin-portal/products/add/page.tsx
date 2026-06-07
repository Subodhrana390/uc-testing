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
    sale_price: "",
    sku: "",
    barcode: "",
    brand_id: "",
    category_id: "",
    stock_quantity: "0",
    unit: "pcs",
    moq: "1",
    short_description: "",
    long_description: "",
    specification: "",
    manufacturing_info: "",
    warranty_info: "",
    images: [] as string[],
    tax_rate: "0",
    is_featured: false,
    is_recommended: false,
    is_best_seller: false,
    is_trending: false,
    is_new_arrival: false,
    is_on_sale: false,
    is_hot_deal: false,
    is_top_rated: false,
    is_industrial_grade: false,
    is_ready_stock: false,
    is_high_demand: false,
    datasheet_url: "",
    visibility: true,
    seo_title: "",
    seo_keywords: "",
    seo_description: "",
  });

  const [brands, setBrands] = useState<any[]>([]);
  const [dynamicAttributes, setDynamicAttributes] = useState<any[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [relationType, setRelationType] = useState("related");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState("");

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

  const searchProducts = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from("products")
      .select("id, name, sku, price")
      .ilike("name", `%${term}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const addRelatedProduct = (product: any) => {
    if (relatedProducts.find(p => p.id === product.id && p.relation_type === relationType)) return;
    setRelatedProducts([...relatedProducts, { ...product, relation_type: relationType }]);
    setSearchTerm("");
    setSearchResults([]);
  };

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

    const price = parseFloat(formData.price);
    const salePrice = formData.sale_price ? parseFloat(formData.sale_price) : null;

    if (salePrice !== null && salePrice >= price) {
      toast.error("Sale price must be less than the regular price.");
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug(formData.name);
      const { data: product, error: productError } = await supabase.from("products").insert([
        {
          name: formData.name,
          slug,
          sku: formData.sku,
          barcode: formData.barcode,
          brand_id: formData.brand_id || null,
          price: parseFloat(formData.price),
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          category_id: formData.category_id,
          stock_quantity: parseInt(formData.stock_quantity),
          unit: formData.unit,
          moq: parseInt(formData.moq),
          short_description: formData.short_description,
          long_description: formData.long_description,
          specification: formData.specification,
          manufacturing_info: formData.manufacturing_info,
          warranty_info: formData.warranty_info,
          image_url: formData.images[0] || null,
          images: formData.images,
          datasheet_url: formData.datasheet_url || null,
          status: formData.visibility ? "Active" : "Draft",
          tax_rate: parseFloat(formData.tax_rate || "0"),
          visibility: formData.visibility,
          is_featured: formData.is_featured,
          is_recommended: formData.is_recommended,
          is_best_seller: formData.is_best_seller,
          is_trending: formData.is_trending,
          is_new_arrival: formData.is_new_arrival,
          is_on_sale: formData.is_on_sale,
          is_hot_deal: formData.is_hot_deal,
          is_top_rated: formData.is_top_rated,
          is_industrial_grade: formData.is_industrial_grade,
          is_ready_stock: formData.is_ready_stock,
          is_high_demand: formData.is_high_demand,
          seo_title: formData.seo_title || null,
          seo_keywords: formData.seo_keywords || null,
          seo_description: formData.seo_description || null,
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

      // Insert related products
      const relationInserts = relatedProducts.map(rp => ({
        product_id: product.id,
        related_id: rp.id,
        relation_type: 'related'
      }));

      if (relationInserts.length > 0) {
        const { error: relError } = await supabase.from("related_products").insert(
          relatedProducts.map(rp => ({
            product_id: product.id,
            related_id: rp.id,
            relation_type: rp.relation_type
          }))
        );
        if (relError) throw relError;
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
  const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

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
                      const mainCat = categories.find(c => c.id === mainId);
                      setFormData({
                        ...formData,
                        category_id: mainId,
                        brand_id: "",
                        tax_rate: mainCat ? mainCat.tax_rate.toString() : formData.tax_rate
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
                        const subId = e.target.value;
                        if (!subId) {
                          const mainCat = categories.find((c: any) => c.id === selectedMainCategoryId);
                          setFormData({ ...formData, category_id: selectedMainCategoryId, tax_rate: mainCat ? mainCat.tax_rate.toString() : formData.tax_rate });
                        } else {
                          const subCat = categories.find((c: any) => c.id === subId);
                          setFormData({ ...formData, category_id: subId, tax_rate: subCat ? subCat.tax_rate.toString() : formData.tax_rate });
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
                      Auto-applied Tax Rate: {categories.find((c: any) => c.id === formData.category_id)?.tax_rate || 0}%
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass} htmlFor="price">Base Price (₹) *</label>
                  <input
                    id="price"
                    type="number"
                    className={inputClass}
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="sale_price">Sale Price (₹)</label>
                  <input
                    id="sale_price"
                    type="number"
                    className={inputClass}
                    placeholder="0.00"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="tax_rate">Tax Rate (%)</label>
                  <div className="relative">
                    <input
                      id="tax_rate"
                      type="number"
                      className={inputClass}
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass} htmlFor="stock">Stock Quantity</label>
                  <input
                    id="stock"
                    type="number"
                    className={inputClass}
                    placeholder="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
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
                <div>
                  <label className={labelClass} htmlFor="moq">Minimum Order Quantity (MOQ)</label>
                  <input
                    id="moq"
                    type="number"
                    className={inputClass}
                    placeholder="1"
                    value={formData.moq}
                    onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Tabs Section */}
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="flex border-b bg-gray-50/50 overflow-x-auto no-scrollbar">
              {['description', 'attributes', 'specification', 'logistics', 'relations', 'seo'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize border-b-2 whitespace-nowrap transition-colors ${activeTab === tab
                    ? "border-black text-black bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-6">
              {activeTab === 'description' && (
                <div className="space-y-6">
                  <RichTextEditor
                    label="Product Long Description"
                    value={formData.long_description}
                    onChange={(content) => handleEditorChange("long_description", content)}
                  />
                  <RichTextEditor
                    label="Key Features"
                    value={formData.specification} // Re-using specification as Features for now or map correctly
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

              {activeTab === 'specification' && (
                <div className="space-y-6">
                  <RichTextEditor
                    label="Technical Specifications"
                    value={formData.specification}
                    onChange={(content) => handleEditorChange("specification", content)}
                  />
                  <RichTextEditor
                    label="Applications"
                    value={formData.manufacturing_info}
                    onChange={(content) => handleEditorChange("manufacturing_info", content)}
                  />
                </div>
              )}

              {activeTab === 'logistics' && (
                <div className="space-y-6">
                  <RichTextEditor
                    label="Manufacturing Information"
                    value={formData.manufacturing_info}
                    onChange={(content) => handleEditorChange("manufacturing_info", content)}
                  />
                  <RichTextEditor
                    label="Warranty & Support"
                    value={formData.warranty_info}
                    onChange={(content) => handleEditorChange("warranty_info", content)}
                  />
                </div>
              )}

              {activeTab === 'relations' && (
                <div className="space-y-6">
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Relation Type</label>
                        <select 
                          className={inputClass}
                          value={relationType}
                          onChange={(e) => setRelationType(e.target.value)}
                        >
                          <option value="related">Related Products</option>
                          <option value="similar">Similar Products</option>
                          <option value="frequently_bought">Frequently Bought Together</option>
                          <option value="cross_sell">Cross Sell Products</option>
                          <option value="alternative">Alternative Products</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Search Product to Add</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className={`${inputClass} pl-10`}
                            placeholder="Type product name..."
                            value={searchTerm}
                            onChange={(e) => searchProducts(e.target.value)}
                          />
                          {searchResults.length > 0 && (
                            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                              {searchResults.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => addRelatedProduct(p)}
                                  className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center justify-between border-b last:border-0 transition-colors"
                                >
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{p.name}</p>
                                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{p.sku || "NO-SKU"}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-zinc-100 rounded-full">Add as {relationType.replace('_', ' ')}</span>
                                    <Plus className="w-4 h-4 text-primary" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {['related', 'similar', 'frequently_bought', 'cross_sell', 'alternative'].map((type) => {
                      const typedProducts = relatedProducts.filter(p => p.relation_type === type);
                      if (typedProducts.length === 0) return null;

                      return (
                        <div key={type} className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-primary" />
                            {type.replace('_', ' ')}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {typedProducts.map((rp) => (
                              <div key={`${rp.id}-${type}`} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-zinc-50 border flex items-center justify-center text-zinc-300 font-black text-xs">
                                    {rp.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-zinc-900">{rp.name}</p>
                                    <p className="text-[10px] text-zinc-400 font-mono">{rp.sku || "N/A"} • ₹{rp.price}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setRelatedProducts(relatedProducts.filter(p => !(p.id === rp.id && p.relation_type === type)))}
                                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {relatedProducts.length === 0 && (
                      <div className="py-12 text-center bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-100">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic">No connections established yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
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
                </div>
              )}
            </div>
          </section>

          {/* Product Images Section */}
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-gray-50/50">
              <h2 className="text-lg font-semibold">Product Images</h2>
            </div>
            <div className="p-6">
              <MultiImageUpload
                images={formData.images}
                onChange={(images) => setFormData(prev => ({ ...prev, images }))}
              />
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
              <h2 className="text-lg font-semibold">Visibility & Status</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Publish Status</span>
                <button
                  onClick={() => setFormData({ ...formData, visibility: !formData.visibility })}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${formData.visibility ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {formData.visibility ? 'Active' : 'Hidden'}
                </button>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Flags</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'is_featured', label: 'Featured' },
                    { key: 'is_recommended', label: 'Recommended' },
                    { key: 'is_best_seller', label: 'Best Seller' },
                    { key: 'is_trending', label: 'Trending' },
                    { key: 'is_new_arrival', label: 'New Arrival' },
                    { key: 'is_on_sale', label: 'On Sale' },
                    { key: 'is_hot_deal', label: 'Hot Deal' },
                    { key: 'is_top_rated', label: 'Top Rated' },
                    { key: 'is_industrial_grade', label: 'Industrial' },
                    { key: 'is_ready_stock', label: 'In Stock' },
                    { key: 'is_high_demand', label: 'High Demand' },
                  ].map((flag) => (
                    <button
                      key={flag.key}
                      onClick={() => setFormData({ ...formData, [flag.key]: !formData[flag.key as keyof typeof formData] })}
                      className={`flex items-center justify-center px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${formData[flag.key as keyof typeof formData] ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      {flag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}