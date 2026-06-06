"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ShieldCheck, ShoppingBag, Truck, X, Star, FileText, Download, Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { formatCurrency } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import LogoLoader from "@/components/ui/LogoLoader";
import AddToCartButton from "@/components/storefront/AddToCartButton";
import WishlistToggleButton from "@/components/storefront/WishlistToggleButton";
import ProductReviews from "@/components/storefront/ProductReviews";
import DeliveryEstimator from "@/components/storefront/DeliveryEstimator";
import FrequentlyBoughtTogether from "@/components/storefront/FrequentlyBoughtTogether";
import RelatedProducts from "@/components/storefront/RelatedProducts";
import ProductCard from "@/components/storefront/ProductCard";
import ProductCarousel from "@/components/storefront/ProductCarousel";
import TopSellingProducts from "@/components/storefront/TopSellingProducts";
import { isInCart, updateCartItemQuantity } from "@/lib/cart";
import { sanitizeHtml } from "@/lib/sanitize";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = useMemo(() => createClient(), []);
  const [product, setProduct] = useState<any>(null);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("description");

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const resumeTimeoutRef = useMemo(() => ({ current: null as any }), []);

  const handleUserInteraction = () => {
    setIsAutoScrollPaused(true);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollPaused(false);
    }, 6000); // Resume auto-scroll after 6 seconds of inactivity
  };

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [resumeTimeoutRef]);

  // Auto-scrolling gallery effect
  useEffect(() => {
    if (!product || !product.images || product.images.length <= 1) return;
    if (isAutoScrollPaused) return;

    const interval = setInterval(() => {
      setActiveImage((prev) => {
        const imgs = product.images;
        const currIndex = imgs.indexOf(prev || "");
        const nextIndex = (currIndex + 1) % imgs.length;
        return imgs[nextIndex];
      });
    }, 4000); // Auto-slide every 4 seconds

    return () => clearInterval(interval);
  }, [product, isAutoScrollPaused]);

  // Touch swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleUserInteraction();
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (Math.abs(diffX) > 50) { // Swipe threshold: 50px
      const imgs = product?.images || [];
      if (imgs.length > 1) {
        const currIdx = imgs.indexOf(activeImage || "");
        if (diffX > 0) {
          // Swipe left -> Next image
          const nextIdx = (currIdx + 1) % imgs.length;
          setActiveImage(imgs[nextIdx]);
        } else {
          // Swipe right -> Prev image
          const prevIdx = (currIdx - 1 + imgs.length) % imgs.length;
          setActiveImage(imgs[prevIdx]);
        }
      }
    }
    setTouchStartX(null);
  };

  const handleShare = async () => {
    if (!product) return;
    const shareData = {
      title: product.name,
      text: product.short_description || `Check out ${product.name} on UC Enterprises`,
      url: window.location.origin + `/products/${product.slug}`,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          toast.error("Failed to share product.");
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Product link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link.");
      }
    }
  };

  useEffect(() => {
    async function fetchProduct() {
      const { data: productData } = await supabase
        .from("products")
        .select("*, categories(id, name, slug, parent:categories!parent_id(name, slug)), brands(name)")
        .eq("slug", slug)
        .single();

      if (productData) {
        // Fetch rating aggregate
        const { data: ratingData } = await supabase
          .from("product_reviews")
          .select("rating")
          .eq("product_id", productData.id);

        const reviewCount = ratingData?.length || 0;
        const averageRating = reviewCount > 0
          ? ratingData!.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount
          : 0;

        const { data: attrData } = await supabase
          .from("product_attributes")
          .select(`
            value,
            attribute:attributes (
              name,
              group:attribute_groups (
                name
              )
            )
          `)
          .eq("product_id", productData.id);

        setAttributes(attrData || []);

        setProduct({
          ...productData,
          averageRating: averageRating.toFixed(1),
          reviewCount
        });
      }
      setLoading(false);
    }

    if (slug) {
      fetchProduct();
      window.scrollTo(0, 0);
    }
  }, [slug, supabase]);

  useEffect(() => {
    if (product) {
      setActiveImage(product.images?.[0] || product.image_url || "/images/prod_main.png");
    }
  }, [product]);

  // Auto-update cart when quantity changes and product is in cart
  useEffect(() => {
    if (product && isInCart(product.id)) {
      updateCartItemQuantity(product.id, quantity);
    }
  }, [quantity, product]);

  if (loading) {
    return <LogoLoader text="Loading product details..." />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-black text-zinc-950">Product not found</h1>
        <Link href="/products" className="mt-4 inline-block text-sm font-black uppercase tracking-widest text-primary">
          Return to products
        </Link>
      </div>
    );
  }

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case "description":
        return (
          <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-loose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.long_description || product.description || "<p>Detailed description coming soon.</p>") }} />
        );
      case "specification":
        return (
          <div className="space-y-12">
            {/* HTML Specification Field */}
            {product.specification && (
              <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.specification) }}
              />
            )}

            {/* Dynamic Attributes */}
            {attributes.length > 0 && (
              <div className="space-y-10">
                {Object.entries(
                  attributes.reduce((acc: any, curr: any) => {
                    const groupName = curr.attribute?.group?.name || "Other Specifications";
                    if (!acc[groupName]) acc[groupName] = [];
                    acc[groupName].push(curr);
                    return acc;
                  }, {})
                ).map(([groupName, items]: [string, any]) => (
                  <div key={groupName} className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100 pb-3">{groupName}</h4>
                    <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
                      {items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-zinc-50/50">
                          <span className="text-xs font-bold text-zinc-500">{item.attribute?.name}</span>
                          <span className="text-xs font-black text-zinc-950">
                            {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Datasheet Download */}
            {product.datasheet_url && (
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between mb-8 max-w-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-teal-650" />
                  <div>
                    <p className="text-xs font-bold text-zinc-800">Product Datasheet (PDF)</p>
                    <p className="text-[10px] text-zinc-400">Technical specifications and usage guidelines</p>
                  </div>
                </div>
                <a
                  href={product.datasheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            )}

            {!product.specification && attributes.length === 0 && (
              <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest">Technical Specifications Pending.</p>
            )}
          </div>
        );
      case "manufacturing":
        return (
          <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-loose"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.manufacturing_info || "<p>Manufacturing details pending.</p>") }}
          />
        );
      case "warranty":
        return (
          <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-loose"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.warranty_info || "<p>Warranty details pending.</p>") }}
          />
        );
      case "shipping":
        return (
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Dispatch Schedule Card */}
            <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">
                Dispatch Schedule
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-orange-200/30 pb-3">
                  <span className="text-xs font-bold text-zinc-600">Local (Punjab):</span>
                  <span className="text-xs font-black text-zinc-900">24-48 Hours</span>
                </div>
                <div className="flex justify-between border-b border-orange-200/30 pb-3">
                  <span className="text-xs font-bold text-zinc-600">North India:</span>
                  <span className="text-xs font-black text-zinc-900">2-4 Working Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-zinc-600">Metros:</span>
                  <span className="text-xs font-black text-zinc-900">3-5 Working Days</span>
                </div>
              </div>
            </div>

            {/* Heavy Freight Notice Card */}
            <div className="flex flex-col justify-center p-8 border-2 border-dashed border-zinc-100 rounded-[2.5rem]">
              <p className="text-xs font-bold text-zinc-500 leading-relaxed italic">
                "For heavy industrial machinery exceeding 200kg, custom freight quotes will be provided post-checkout by our logistics team."
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
          <ChevronRight className="h-3 w-3" />
          {product.categories?.parent?.name && (
            <>
              <span className="text-zinc-300">{product.categories.parent.name}</span>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-zinc-900">{product.categories?.name || "Uncategorized"}</span>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="flex flex-col-reverse lg:flex-row gap-6">
            {/* Thumbnails - Left on desktop, bottom on mobile */}
            {product.images && product.images.length > 1 && (
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto no-scrollbar pb-2 lg:pb-0 snap-x lg:snap-y max-h-[600px]">
                {product.images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleUserInteraction();
                      setActiveImage(img);
                    }}
                    className={`relative w-20 h-20 lg:w-24 lg:h-24 shrink-0 snap-center transition-all rounded-sm overflow-hidden ${activeImage === img
                      ? "border-1 border-black" : "border-none"}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Primary Image */}
            <div className="flex-1 max-w-[450px] mx-auto lg:mx-0 w-full">
              <div
                className="relative aspect-square overflow-hidden rounded-[2.5rem] group cursor-zoom-in"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  e.currentTarget.style.setProperty('--x', `${x}%`);
                  e.currentTarget.style.setProperty('--y', `${y}%`);
                }}
              >
                <Image
                  src={activeImage || "/images/prod_main.png"}
                  alt={product.name}
                  fill
                  className="object-contain p-6 transition-transform duration-200 group-hover:scale-[2.5]"
                  style={{
                    transformOrigin: 'var(--x, 50%) var(--y, 50%)'
                  } as any}
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              {product.is_ready_stock && <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-100">Ready to Ship</span>}
              {product.is_industrial_grade && <span className="bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">Industrial Grade</span>}
              {product.is_best_seller && <span className="bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-amber-100">Best Seller</span>}
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-950 leading-[1.1]">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className={`h-4 w-4 ${Number(product.averageRating) > 0 ? "fill-amber-500" : ""}`} />
                  <span className="text-sm font-black">{Number(product.averageRating) > 0 ? product.averageRating : "N/A"}</span>
                  <span className="text-zinc-400 text-xs font-bold ml-1">({product.reviewCount} Reviews)</span>
                </div>
                <span className="text-zinc-200">|</span>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Brand: <span className="text-zinc-900">{product.brands?.name || "UC Generic"}</span></span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600 max-w-xl">
                {product.short_description || "High-performance industrial solution designed for precision and durability in professional environments."}
              </p>
            </div>

            <div className="space-y-4 py-2">
              {/* Price Block */}
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
                <span className="text-4xl sm:text-5xl font-black text-zinc-950 tracking-tighter">
                  {formatCurrency(product.price)}
                </span>
                {product.sale_price && (
                  <span className="text-xl sm:text-2xl font-bold text-zinc-300 line-through tracking-tighter">
                    {formatCurrency(product.sale_price)}
                  </span>
                )}
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">
                  GST Inclusive
                </span>
              </div>

              {/* Responsive Controls Block (Quantity, MOQ, Actions) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  {/* Quantity Counter */}
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-10 w-10 flex items-center justify-center border border-zinc-200 rounded-l-xl hover:bg-zinc-50 text-zinc-600 active:bg-zinc-100 transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="h-10 w-12 sm:w-16 border-y border-zinc-200 text-center font-black text-zinc-900 focus:outline-none text-sm"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-10 w-10 flex items-center justify-center border border-zinc-200 rounded-r-xl hover:bg-zinc-50 text-zinc-600 active:bg-zinc-100 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* MOQ Indicator */}
                  {product.moq > 1 && (
                    <span className="text-xs font-black text-zinc-500 whitespace-nowrap">
                      MOQ: {product.moq} {product.unit || "Units"}
                    </span>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <AddToCartButton
                    product={product}
                    quantity={quantity}
                    className="h-10 flex-1 sm:flex-initial justify-center rounded-xl bg-zinc-950 px-8 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary shadow-md shadow-zinc-100 transition-all active:scale-[0.98]"
                  />

                  <WishlistToggleButton
                    productId={product.id}
                    label={null as any}
                    className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 p-0 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                  />

                  <button
                    onClick={handleShare}
                    className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 p-0 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-zinc-500 hover:text-zinc-900"
                    title="Share Product"
                  >
                    <Share2 className="w-4 h-4 text-zinc-500" />
                  </button>

                  {product.datasheet_url && (
                    <a
                      href={product.datasheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-4 rounded-xl border border-zinc-200 flex items-center gap-2 hover:bg-zinc-50 hover:border-zinc-350 transition-colors text-xs font-bold text-zinc-700"
                      title="Download Product Datasheet (PDF)"
                    >
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <span className="hidden xs:inline">Datasheet</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
            <DeliveryEstimator />
          </div>
        </div>

        {/* Technical Tabs */}
        <section className="mt-8">
          {/* Desktop Tab Headers (hidden on mobile) */}
          <div className="hidden sm:flex w-full justify-start border-b border-zinc-100 gap-12 pb-0">
            {[
              { id: "description", label: "Overview" },
              { id: "specification", label: "Technical Specs" },
              { id: "manufacturing", label: "Applications & Mfg" },
              { id: "warranty", label: "Warranty & Support" },
              { id: "shipping", label: "Shipping & Delivery" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                  ? "border-primary text-zinc-950"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile Tab-Accordion (hidden on desktop) */}
          <div className="flex sm:hidden flex-col w-full gap-3">
            {[
              { id: "description", label: "Overview" },
              { id: "specification", label: "Technical Specs" },
              { id: "manufacturing", label: "Applications & Mfg" },
              { id: "warranty", label: "Warranty & Support" },
              { id: "shipping", label: "Shipping & Delivery" }
            ].map((tab) => (
              <div key={tab.id} className="w-full border-b border-zinc-100 pb-3">
                <button
                  onClick={() => setActiveTab(activeTab === tab.id ? "" : tab.id)}
                  className={`w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all text-left flex items-center justify-between ${activeTab === tab.id
                    ? "text-primary"
                    : "text-zinc-600 hover:text-zinc-950"
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-xs">{activeTab === tab.id ? "−" : "+"}</span>
                </button>
                {activeTab === tab.id && (
                  <div className="pt-4 pb-2">
                    {renderTabContent(tab.id)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Tab Content Panel (hidden on mobile) */}
          <div className="hidden sm:block mt-12 max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent(activeTab)}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <div className="mt-4">
          <ProductReviews productId={product.id} />
        </div>

        {/* Frequently Bought Together */}
        <FrequentlyBoughtTogether currentProduct={product} />

        {/* Similar Products */}
        <SimilarProducts categoryId={product.category_id} currentProductId={product.id} />

        {/* Related Products */}
        <RelatedProducts categoryId={product.category_id} currentProductId={product.id} />

        {/* Top Selling Products */}
        <TopSellingProducts currentProductId={product.id} />




      </div>
    </div>
  );
}

function SimilarProducts({ categoryId, currentProductId }: { categoryId: string | null; currentProductId: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSimilar() {
      let matchedProducts: any[] = [];

      // 1. Try to fetch from the same category if categoryId is present
      if (categoryId) {
        const { data } = await supabase
          .from("products")
          .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
          .eq("category_id", categoryId)
          .neq("id", currentProductId)
          .eq("status", "Active")
          .limit(4);
        if (data) {
          matchedProducts = data;
        }
      }

      // 2. If we need more products to reach 4, fetch general active products as fallback
      if (matchedProducts.length < 4) {
        const { data: fallbackData } = await supabase
          .from("products")
          .select("*, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
          .neq("id", currentProductId)
          .eq("status", "Active")
          .limit(10); // Fetch a small pool to filter out duplicates in JS

        if (fallbackData) {
          const matchedIds = new Set(matchedProducts.map(p => p.id));
          const combined = [...matchedProducts];
          for (const item of fallbackData) {
            if (combined.length >= 4) break;
            if (!matchedIds.has(item.id)) {
              combined.push(item);
              matchedIds.add(item.id);
            }
          }
          matchedProducts = combined;
        }
      }

      setProducts(matchedProducts);
    }
    fetchSimilar();
  }, [categoryId, currentProductId, supabase]);

  if (products.length === 0) return null;

  return (
    <div className="mt-4 py-8">
      <div className="mb-10 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Related Equipment</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">Customers also viewed</h2>
      </div>
      <ProductCarousel products={products} />
    </div>
  );
}
