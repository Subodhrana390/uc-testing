"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, FileText, Download, Share2, Star } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import AddToCartButton from "@/components/storefront/AddToCartButton";
import WishlistToggleButton from "@/components/storefront/WishlistToggleButton";
import DeliveryEstimator from "@/components/storefront/DeliveryEstimator";
import FrequentlyBoughtTogether from "@/components/storefront/FrequentlyBoughtTogether";
import ProductReviews from "@/components/storefront/ProductReviews";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import { addCartItem, isInCart, updateCartItemQuantity } from "@/lib/cart";
import { sanitizeHtml } from "@/lib/sanitize";
import { useRouter } from "next/navigation";
import ShareModal from "@/components/storefront/ShareModal";

export default function ProductDetailsClient({ 
  product, 
  attributes 
}: { 
  product: any, 
  attributes: any[] 
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("description");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const resumeTimeoutRef = useMemo(() => ({ current: null as any }), []);

  const handleBuyNow = () => {
    const price = Number(product.sale_price || product.price) || 0;
    addCartItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price,
        image_url: product.image_url,
        moq: product.moq || 1,
      },
      quantity
    );
    router.push("/checkout");
  };

  const handleUserInteraction = () => {
    setIsAutoScrollPaused(true);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollPaused(false);
    }, 6000);
  };

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [resumeTimeoutRef]);

  // Record to recently viewed on mount
  useEffect(() => {
    if (product) {
      addRecentlyViewed({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        sale_price: product.sale_price ?? null,
        image_url: product.image_url ?? null,
        category_name: product.categories?.name ?? null,
      });
      setActiveImage(product.images?.[0] || product.image_url || null);
    }
  }, [product]);

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
    }, 4000);

    return () => clearInterval(interval);
  }, [product, isAutoScrollPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    handleUserInteraction();
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (Math.abs(diffX) > 50) {
      const imgs = product?.images || [];
      if (imgs.length > 1) {
        const currIdx = imgs.indexOf(activeImage || "");
        if (diffX > 0) {
          const nextIdx = (currIdx + 1) % imgs.length;
          setActiveImage(imgs[nextIdx]);
        } else {
          const prevIdx = (currIdx - 1 + imgs.length) % imgs.length;
          setActiveImage(imgs[prevIdx]);
        }
      }
    }
    setTouchStartX(null);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  useEffect(() => {
    if (product && isInCart(product.id)) {
      updateCartItemQuantity(product.id, quantity);
    }
  }, [quantity, product]);

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case "description":
        return (
          <div className="prose prose-base max-w-none text-zinc-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.long_description || product.description || "<p>Detailed description coming soon.</p>") }} />
        );
      case "specification":
        return (
          <div className="space-y-12">
            {product.specification && (
              <div className="prose prose-base max-w-none text-zinc-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.specification) }}
              />
            )}
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
          <div className="prose prose-base max-w-none text-zinc-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.manufacturing_info || "<p>Manufacturing details pending.</p>") }}
          />
        );
      case "warranty":
        return (
          <div className="prose prose-base max-w-none text-zinc-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.warranty_info || "<p>Warranty details pending.</p>") }}
          />
        );
      case "shipping":
        return (
          <div className="grid gap-6 sm:grid-cols-2">
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
    <>
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-500 mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
        <ChevronRight className="h-3 w-3" />
        {product.categories?.parent?.name && (
          <>
            <Link 
              href={`/categories/${product.categories.parent.slug}`} 
              className="hover:text-primary transition-colors"
            >
              {product.categories.parent.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        {product.categories?.slug ? (
          <Link 
            href={`/categories/${product.categories.slug}`} 
            className="hover:text-primary transition-colors text-zinc-900 font-semibold"
          >
            {product.categories.name}
          </Link>
        ) : (
          <span className="text-zinc-900 font-semibold">{product.categories?.name || "Uncategorized"}</span>
        )}
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="flex flex-col-reverse lg:flex-row gap-6">
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
                    sizes="100px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 max-w-[450px] mx-auto lg:mx-0 w-full relative">
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
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-6 transition-transform duration-200 group-hover:scale-[2.5]"
                  style={{
                    transformOrigin: 'var(--x, 50%) var(--y, 50%)'
                  } as any}
                />
              ) : (
                <div className="absolute inset-0 bg-zinc-50 flex items-center justify-center rounded-[2.5rem]">
                  <span className="text-xs text-zinc-300 font-bold uppercase tracking-widest text-center">No Image</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-wrap gap-2">
            {product.is_ready_stock && <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-100">Ready to Ship</span>}
            {product.is_industrial_grade && <span className="bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">Industrial Grade</span>}
            {product.is_best_seller && <span className="bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-amber-100">Best Seller</span>}
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 leading-[1.2]">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className={`h-4 w-4 ${Number(product.averageRating) > 0 ? "fill-amber-500" : ""}`} />
                <span className="text-sm font-bold">{Number(product.averageRating) > 0 ? product.averageRating : "N/A"}</span>
                <span className="text-zinc-500 text-sm font-medium ml-1">({product.reviewCount} Reviews)</span>
              </div>
              <span className="hidden sm:inline text-zinc-200">|</span>
              <span className="text-sm font-medium text-zinc-500">Brand: <span className="text-zinc-900 font-semibold">{product.brands?.name || "UC Generic"}</span></span>
              
              <span className="hidden sm:inline text-zinc-200">|</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleShare();
                }}
                className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-primary transition-colors active:scale-95 ml-auto sm:ml-0"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
            <p className="text-base leading-relaxed text-zinc-600 max-w-2xl">
              {product.short_description || "High-performance industrial solution designed for precision and durability in professional environments."}
            </p>
          </div>

          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
                {formatCurrency(product.sale_price || product.price)}
              </span>
              {product.sale_price && (
                <span className="text-lg sm:text-xl font-medium text-zinc-400 line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                GST Inclusive
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
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

                {product.moq > 1 && (
                  <span className="text-xs font-black text-zinc-500 whitespace-nowrap">
                    MOQ: {product.moq} {product.unit || "Units"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <AddToCartButton
                  product={product}
                  quantity={quantity}
                  className="h-11 flex-1 min-w-[140px] sm:flex-initial justify-center rounded-xl bg-zinc-950 px-4 sm:px-8 text-xs font-bold text-white hover:bg-zinc-800 shadow-md shadow-zinc-100 transition-all active:scale-[0.98] whitespace-nowrap"
                />
                <button
                  onClick={handleBuyNow}
                  className="h-11 flex-1 min-w-[140px] sm:flex-initial justify-center rounded-xl bg-primary px-4 sm:px-8 text-xs font-bold text-white hover:bg-red-700 shadow-md shadow-red-100 transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  Buy Now
                </button>
                <WishlistToggleButton
                  productId={product.id}
                  label={null as any}
                  className="h-11 w-11 shrink-0 rounded-xl border border-zinc-200 p-0 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                />
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

      <section className="mt-8">
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
              className={`pb-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                ? "border-primary text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex sm:hidden flex-col w-full gap-8">
          {[
            { id: "description", label: "Overview" },
            { id: "specification", label: "Technical Specs" },
            { id: "manufacturing", label: "Applications & Mfg" },
            { id: "warranty", label: "Warranty & Support" },
            { id: "shipping", label: "Shipping & Delivery" }
          ].map((tab) => (
            <div key={tab.id} className="w-full border-b border-zinc-100 pb-8 last:border-0 last:pb-0">
              <h3 className="text-xl font-bold text-zinc-900 mb-4">
                {tab.label}
              </h3>
              <div className="pt-2">
                {renderTabContent(tab.id)}
              </div>
            </div>
          ))}
        </div>

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

      <FrequentlyBoughtTogether currentProduct={product} />
    </>
  );
}
