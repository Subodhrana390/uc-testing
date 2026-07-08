"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileText, Download, Share2, Star, CreditCard, AlertCircle, Loader2, ShieldCheck, Wallet, Banknote } from "lucide-react";
import { formatCurrency, getExclusivePrice } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import AddToCartButton from "@/components/storefront/AddToCartButton";
import WishlistToggleButton from "@/components/storefront/WishlistToggleButton";
import DeliveryEstimator from "@/components/storefront/DeliveryEstimator";
import ProductReviews from "@/components/storefront/ProductReviews";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import { sanitizeHtml } from "@/lib/sanitize";
import { useRouter } from "next/navigation";
import ShareModal from "@/components/storefront/ShareModal";
import { useCartStore } from "@/store/useCartStore";
import FrequentlyBoughtTogether from "@/components/storefront/FrequentlyBoughtTogether";

export default function ProductDetailsClient({
  product,
  attributes,
  frequentlyBoughtTogetherEnabled = true
}: {
  product: any;
  attributes: any[];
  frequentlyBoughtTogetherEnabled?: boolean;
}) {
  const router = useRouter();
  const { addItem, updateQuantity, isInCart, items: cartItems } = useCartStore();
  const existingCartItem = useMemo(() => cartItems.find((item) => item.id === product.id), [cartItems, product.id]);

  const originalPrice = Number(product.price);
  const salePriceVal = product.sale_price ? Number(product.sale_price) : 0;
  const discount = (salePriceVal > 0 && originalPrice > 0 && originalPrice > salePriceVal)
    ? Math.round(((originalPrice - salePriceVal) / originalPrice) * 100)
    : null;
  const [quantity, setQuantity] = useState(1);

  const hasVariants = product.variants && product.variants.length > 0;
  const defaultVariant = hasVariants ? (product.variants.find((v: any) => v.is_default) || product.variants[0]) : null;

  const [selectedVariant, setSelectedVariant] = useState(defaultVariant);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
    if (defaultVariant && defaultVariant.attributes) {
      return defaultVariant.attributes;
    }
    return {};
  });

  useEffect(() => {
    if (hasVariants) {
      const match = product.variants.find((v: any) => {
        return Object.entries(selectedAttributes).every(([key, val]) => v.attributes[key] === val);
      });
      if (match) setSelectedVariant(match);
    }
  }, [selectedAttributes, hasVariants, product.variants]);

  const activeProduct = selectedVariant ? { ...product, ...selectedVariant, id: selectedVariant.id, product_id: product.id } : product;

  // Sync quantity state when existingCartItem changes or product changes
  useEffect(() => {
    if (existingCartItem) {
      setQuantity(existingCartItem.quantity);
    } else {
      setQuantity(1);
    }
  }, [existingCartItem, activeProduct.id]);

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("description");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [emiPlans, setEmiPlans] = useState<any[]>([]);
  const [lowestEMI, setLowestEMI] = useState<number | null>(null);
  const [isEmiModalOpen, setIsEmiModalOpen] = useState(false);
  const [fetchingEmi, setFetchingEmi] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const resumeTimeoutRef = useMemo(() => ({ current: null as any }), []);

  const handleBuyNow = () => {
    const price = Number(activeProduct.sale_price || activeProduct.price) || 0;
    const item = {
      id: activeProduct.id,
      slug: activeProduct.slug,
      name: activeProduct.name,
      price,
      image_url: activeProduct.image_url || activeProduct.images?.[0] || "",
      quantity,
      variant_attributes: activeProduct.attributes,
      product_id: activeProduct.product_id || activeProduct.id,
      variant_id: activeProduct.product_id ? activeProduct.id : undefined,
    };
    sessionStorage.setItem("buy_now_item", JSON.stringify(item));
    router.push("/checkout?buyNow=true");
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

  // Fetch EMI options on mount
  useEffect(() => {
    const price = Number(activeProduct.sale_price || activeProduct.price) || 0;
    if (price >= 3000) {
      setFetchingEmi(true);
      import("@/app/actions/emi").then(({ getEligibleEMIOptions }) => {
        getEligibleEMIOptions(price).then((res) => {
          if (res.success && res.providers) {
            setEmiPlans(res.providers);
            let lowest = Infinity;
            res.providers.forEach((prov: any) => {
              prov.plans.forEach((plan: any) => {
                if (plan.emi < lowest) {
                  lowest = plan.emi;
                }
              });
            });
            if (lowest !== Infinity) {
              setLowestEMI(lowest);
            }
          }
          setFetchingEmi(false);
        }).catch((err) => {
          console.error("Error fetching EMI options:", err);
          setFetchingEmi(false);
        });
      }).catch((err) => {
        console.error("Error loading EMI module:", err);
        setFetchingEmi(false);
      });
    } else {
      setEmiPlans([]);
      setLowestEMI(null);
    }
  }, [activeProduct.price, activeProduct.sale_price]);

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
    if (activeProduct && isInCart(activeProduct.id) && existingCartItem && existingCartItem.quantity !== quantity) {
      updateQuantity(activeProduct.id, quantity);
    }
  }, [quantity, activeProduct.id, existingCartItem, isInCart, updateQuantity]);

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case "description":
        return (
          <div>
            {product.long_description &&
              < div className="prose prose-sm sm:prose-base max-w-none text-zinc-700 leading-relaxed prose-img:rounded-2xl prose-img:mx-auto prose-img:w-auto prose-img:max-h-[500px] prose-img:object-contain prose-img:my-6 prose-img:shadow-sm flow-root" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.long_description) }} />
            }
          </div>);
      case "specification":
        return (
          <div className="space-y-4">
            {product.specification && (
              <div className="prose prose-sm sm:prose-base max-w-none text-zinc-700 leading-relaxed prose-img:rounded-2xl prose-img:mx-auto prose-img:w-auto prose-img:max-h-[500px] prose-img:object-contain prose-img:my-6 prose-img:shadow-sm flow-root"
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
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 max-w-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-teal-650 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-zinc-800">Product Datasheet (PDF)</p>
                    <p className="text-[10px] text-zinc-400">Technical specifications and usage guidelines</p>
                  </div>
                </div>
                <a
                  href={product.datasheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all"
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
          <div className="prose prose-sm sm:prose-base max-w-none text-zinc-700 leading-relaxed prose-img:rounded-2xl prose-img:mx-auto prose-img:w-auto prose-img:max-h-[500px] prose-img:object-contain prose-img:my-6 prose-img:shadow-sm flow-root"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.manufacturing_info || "<p>Manufacturing details pending.</p>") }}
          />
        );
      case "warranty":
        return (
          <div className="prose prose-sm sm:prose-base max-w-none text-zinc-700 leading-relaxed prose-img:rounded-2xl prose-img:mx-auto prose-img:w-auto prose-img:max-h-[500px] prose-img:object-contain prose-img:my-6 prose-img:shadow-sm flow-root"
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
      case "reviews":
        return <ProductReviews productId={product.id} />;
      default:
        return null;
    }
  };

  const isOutOfStock = activeProduct?.stock_quantity === 0;
  const isReadyStock = activeProduct?.stock_quantity > 0;
  const isIndustrialGrade =
    activeProduct?.categories?.name?.toLowerCase().includes("industrial") ||
    activeProduct?.categories?.parent?.name?.toLowerCase().includes("industrial") ||
    Number(activeProduct?.price || 0) >= 50000;

  // Extract all available attribute keys and their unique values across all variants
  const availableAttributes = useMemo(() => {
    if (!hasVariants) return {};
    const attrs: Record<string, Set<string>> = {};
    product.variants.forEach((v: any) => {
      Object.entries(v.attributes || {}).forEach(([key, val]) => {
        if (!attrs[key]) attrs[key] = new Set();
        attrs[key].add(val as string);
      });
    });
    const result: Record<string, string[]> = {};
    Object.keys(attrs).forEach(key => {
      result[key] = Array.from(attrs[key]);
    });
    return result;
  }, [hasVariants, product.variants]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-zinc-500 mb-4">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span className="text-zinc-300">/</span>
        <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
        <span className="text-zinc-300">/</span>
        {product.categories?.parent?.name && (
          <>
            <Link
              href={`/categories/${product.categories.parent.slug}`}
              className="hover:text-primary transition-colors"
            >
              {product.categories.parent.name}
            </Link>
            <span className="text-zinc-300">/</span>
          </>
        )}
        {product.categories?.slug && (
          <>
            <Link
              href={`/categories/${product.categories.slug}`}
              className="hover:text-primary transition-colors"
            >
              {product.categories.name}
            </Link>
            <span className="text-zinc-300">/</span>
          </>
        )}
        <span className="text-zinc-900 font-semibold truncate max-w-[200px] sm:max-w-xs" title={product.name}>
          {product.name}
        </span>
      </div>

      <div className="grid gap-8 lg:gap-12 lg:grid-cols-2">
        <div className="flex flex-col-reverse lg:flex-row gap-4 lg:gap-6 min-w-0">
          {/* Thumbnails: horizontal below image on mobile, vertical left on desktop */}
          {product.images && product.images.length > 1 && (
            <div className="flex flex-row lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto snap-x lg:snap-y lg:max-h-[500px] w-full lg:w-[96px] shrink-0 pb-2 lg:pb-0 lg:pr-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-track]:bg-transparent">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleUserInteraction();
                    setActiveImage(img);
                  }}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-full lg:aspect-square shrink-0 snap-center transition-all rounded-lg overflow-hidden bg-white border ${activeImage === img
                    ? "border-zinc-900 shadow-sm" : "border-zinc-200 hover:border-zinc-400"}`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    fill
                    sizes="(max-width: 1024px) 80px, 96px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Image */}
          <div className="flex-1 w-full relative">
            <div
              className="relative w-full aspect-square overflow-hidden rounded-2xl group cursor-zoom-in bg-white border border-zinc-100"
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
                  className="object-contain p-2 sm:p-6 transition-transform duration-200 group-hover:scale-[2.5]"
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
            {isIndustrialGrade && <span className="bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">Industrial Grade</span>}
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 leading-[1.2]">{activeProduct.name}</h1>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className={`h-4 w-4 ${Number(activeProduct.averageRating) > 0 ? "fill-amber-500" : ""}`} />
                <span className="text-sm font-bold">{Number(activeProduct.averageRating) > 0 ? activeProduct.averageRating : "N/A"}</span>
                <span className="text-zinc-500 text-sm font-medium ml-1">({activeProduct.reviewCount} Reviews)</span>
              </div>
              <span className="hidden sm:inline text-zinc-200">|</span>
              <span className="text-sm font-medium text-zinc-500">Brand: <span className="text-zinc-900 font-semibold">{activeProduct.brands?.name || "UC Generic"}</span></span>
              {activeProduct.sku && (
                <>
                  <span className="hidden sm:inline text-zinc-200">|</span>
                  <span className="text-sm font-medium text-zinc-500">SKU: <span className="text-zinc-900 font-semibold">{activeProduct.sku}</span></span>
                </>
              )}

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
              {activeProduct.short_description}
            </p>
          </div>

          {hasVariants && Object.keys(availableAttributes).length > 0 && (
            <div className="space-y-6 py-4 border-y border-zinc-100">
              {Object.entries(availableAttributes).map(([attrKey, attrValues]) => (
                <div key={attrKey} className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900">{attrKey}</h3>
                  <div className="flex flex-wrap gap-2">
                    {attrValues.map((val) => {
                      const isSelected = selectedAttributes[attrKey] === val;
                      return (
                        <button
                          key={val}
                          onClick={() => setSelectedAttributes({ ...selectedAttributes, [attrKey]: val })}
                          className={`px-4 py-2 text-sm font-semibold border rounded-lg transition-all ${isSelected
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                            }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
                  {formatCurrency(getExclusivePrice(activeProduct.sale_price || activeProduct.price, activeProduct.is_tax_inclusive, activeProduct.igst_rate))}
                </span>
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">+ GST</span>
              </div>
              {activeProduct.sale_price && activeProduct.sale_price < activeProduct.price && (
                <span className="text-lg sm:text-xl font-medium text-zinc-400 line-through">
                  {formatCurrency(getExclusivePrice(activeProduct.price, activeProduct.is_tax_inclusive, activeProduct.igst_rate))}
                </span>
              )}
              {discount && (
                <span className="text-xs font-black text-white bg-primary px-2.5 py-1 rounded-md shadow-sm">
                  {discount}% OFF
                </span>
              )}
            </div>

            {lowestEMI !== null && (
              <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100/80 rounded-2xl max-w-md animate-in fade-in duration-300">
                <CreditCard className="w-5 h-5 text-indigo-650 shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-zinc-650">
                    Easy EMI available from <strong className="text-zinc-950 font-extrabold">{formatCurrency(lowestEMI)}/month</strong>
                  </p>
                </div>
                <button
                  onClick={() => setIsEmiModalOpen(true)}
                  className="text-xs font-black text-indigo-650 hover:text-indigo-800 hover:underline shrink-0"
                >
                  View Plans
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center shrink-0 ${isOutOfStock ? "opacity-50 pointer-events-none" : ""}`}>
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


              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <AddToCartButton
                  product={activeProduct}
                  quantity={quantity}
                  className={`h-11 flex-1 sm:flex-initial justify-center rounded-xl px-2 sm:px-8 text-xs font-bold text-white shadow-md shadow-zinc-100 transition-all active:scale-[0.98] whitespace-nowrap ${isOutOfStock ? "bg-zinc-200 text-zinc-500 cursor-not-allowed hover:bg-zinc-200" : "bg-zinc-950 hover:bg-zinc-800"}`}
                />
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`h-11 flex-1 sm:flex-initial justify-center rounded-xl px-2 sm:px-8 text-xs font-bold text-white shadow-md shadow-red-100 transition-all active:scale-[0.98] whitespace-nowrap ${isOutOfStock ? "bg-zinc-200 text-zinc-500 cursor-not-allowed hover:bg-zinc-200 shadow-none" : "bg-primary hover:bg-red-700"}`}
                >
                  Buy Now
                </button>
                <WishlistToggleButton
                  productId={activeProduct.id}
                  label={null as any}
                  className="h-11 w-11 shrink-0 rounded-xl border border-zinc-200 p-0 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                />
              </div>
            </div>
          </div>
          <DeliveryEstimator />

          {/* Accepted Payment Methods */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Accepted Payment Methods</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-800 tracking-tight select-none">
                <CreditCard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Visa</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-800 tracking-tight select-none">
                <CreditCard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Mastercard</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-800 tracking-tight select-none">
                <Wallet className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>UPI / NetBanking</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-800 tracking-tight select-none">
                <Banknote className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Cash on Delivery</span>
              </div>
            </div>

            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
              100% Safe & Secure Checkout Guaranteed.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-8 md:mt-12">
        {/* Desktop Tabs */}
        <div className="hidden sm:flex w-full justify-start gap-8 lg:gap-12  border-zinc-200">
          {[
            { id: "description", label: "Overview" },
            { id: "specification", label: "Technical Specs" },
            { id: "manufacturing", label: "Applications & Mfg" },
            { id: "warranty", label: "Warranty & Support" },
            { id: "shipping", label: "Shipping & Delivery" },
            { id: "reviews", label: "Reviews" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm lg:text-base font-semibold transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                ? "border-primary text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Sections */}
        <div className="sm:hidden flex flex-col gap-8">
          {[
            { id: "description", label: "Overview" },
            { id: "specification", label: "Technical Specs" },
            { id: "manufacturing", label: "Applications & Mfg" },
            { id: "warranty", label: "Warranty & Support" },
            { id: "shipping", label: "Shipping & Delivery" },
            { id: "reviews", label: "Reviews" },
          ].map((tab) => (
            <div
              key={tab.id}
              className="pb-2 last:border-0 last:pb-0"
            >
              <h3 className="mb-1 text-lg font-bold text-zinc-900">
                {tab.label}
              </h3>

              <div className="space-y-2">
                {renderTabContent(tab.id)}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Content */}
        <div className={`hidden sm:block pt-2 lg:pt-4 transition-all duration-300 ${activeTab === "shipping"
          ? "max-w-3xl"
          : activeTab === "reviews"
            ? "max-w-none"
            : "max-w-5xl"
          }`}>
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
      {frequentlyBoughtTogetherEnabled && (
        <FrequentlyBoughtTogether currentProduct={product} />
      )}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={product.name}
        text={product.short_description || `Check out ${product.name} at UC Enterprises`}
        url={typeof window !== "undefined" ? window.location.href : `https://uc-enterprises.vercel.app/products/${product.slug}`}
        imageUrl={product.image_url || product.images?.[0]}
      />

      <Dialog open={isEmiModalOpen} onOpenChange={setIsEmiModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="text-left border-b border-zinc-100 pb-4">
            <DialogTitle className="text-base font-black uppercase tracking-wide text-zinc-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-650" />
              <span>EMI Payment Plans</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 font-medium">
              Calculated installments for **{product.name}** at {formatCurrency(product.sale_price || product.price)} (Incl. GST)
            </DialogDescription>
          </DialogHeader>

          {fetchingEmi ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Fetching lender plans...</p>
            </div>
          ) : emiPlans.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-xs font-bold text-zinc-500">No EMI options available for this product.</p>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              {emiPlans.map((provider) => (
                <div key={provider.id} className="border border-zinc-150 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                    <span className="text-sm font-black text-zinc-900">{provider.name}</span>
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">Min. spend: {formatCurrency(provider.minOrderAmount)}</span>
                  </div>
                  <div className="grid gap-2">
                    {provider.plans.map((plan: any) => (
                      <div key={plan.id} className="p-3 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors">
                        <div>
                          <span className="font-black text-zinc-800">{plan.tenureMonths} Months</span>
                          <span className="text-[10px] text-zinc-400 font-medium ml-2">
                            Interest: <strong className="text-zinc-700 font-bold">{plan.interestRate}% p.a.</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-zinc-900 block">{formatCurrency(plan.emi)}/mo</span>
                          <span className="text-[9px] text-zinc-400 block font-semibold">Total: {formatCurrency(plan.totalPayable)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
