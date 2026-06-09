import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FolderTree, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import CategorySelector from "@/components/storefront/CategorySelector";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import DealBanner from "@/components/storefront/DealBanner";
import { faqItems } from "@/lib/storefront";
import JsonLd from "@/components/seo/JsonLd";
import { faqSchema, itemListSchema, webPageSchema } from "@/lib/jsonld";
import { homepageMetadata, SITE_URL } from "@/lib/seo";
import dynamic from "next/dynamic";

const RecentlyViewedProducts = dynamic(() => import("@/components/storefront/RecentlyViewedProducts"));
const RecommendedProducts = dynamic(() => import("@/components/storefront/RecommendedProducts"));
const ProductCarousel = dynamic(() => import("@/components/storefront/ProductCarousel"));
const FAQAccordion = dynamic(() => import("@/components/storefront/FAQAccordion"));
const WhyChooseUs = dynamic(() => import("@/components/storefront/WhyChooseUs"));
const Testimonials = dynamic(() => import("@/components/storefront/Testimonials"));


export const metadata: Metadata = homepageMetadata();

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { data: activeProductsData },
    { data: categories },
    { data: banners },
    { data: deals },
    { data: topSelling }
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, price, sale_price, image_url, status, stock_quantity, is_featured, is_best_seller, is_new_arrival, is_trending, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)")
      .eq("status", "Active")
      .or("is_featured.eq.true,is_best_seller.eq.true,is_new_arrival.eq.true,is_trending.eq.true,sale_price.not.is.null"),
    supabase.from("categories").select("id, name, slug, parent_id,image_url").eq("status", true).order("name", { ascending: true }),
    supabase.from("banners").select("*").eq("status", true).order("position", { ascending: true }),
    supabase.from("deals").select("*").eq("status", true).order("position", { ascending: true }),
    supabase.from("top_selling_products").select("id, name, slug, price, sale_price, image_url, status, stock_quantity, categories(name, slug, parent:categories!parent_id(name, slug)), product_reviews(rating)").limit(12),
  ]);

  const allActiveProducts = activeProductsData || [];

  const safeFeatured = allActiveProducts.filter(p => p.is_featured).slice(0, 12);
  const safeBestSellers = allActiveProducts.filter(p => p.is_best_seller).slice(0, 12);
  const safeNewArrivals = allActiveProducts.filter(p => p.is_new_arrival).slice(0, 12);
  const safeTrending = allActiveProducts.filter(p => p.is_trending).slice(0, 12);
  const safeCategories = categories || [];
  const safeBanners = banners || [];
  const safeFlashDeals = allActiveProducts.filter(p => p.sale_price !== null).slice(0, 12);
  const safeDeals = (deals as any[]) || [];
  const safeTopSelling = topSelling || [];

  return (
    <div className="bg-gradient-to-b from-white via-zinc-50/20 to-white min-h-screen relative overflow-hidden">
      {/* Structured Data */}
      <JsonLd data={[
        webPageSchema({
          name: "UC Enterprises — Laboratory, Industrial & Safety Supplies India",
          description: "Shop laboratory chemicals, glassware, safety equipment and industrial tools at UC Enterprises. Pan-India delivery, wholesale pricing.",
          url: SITE_URL,
          type: "WebPage",
        }),
        faqSchema(faqItems.slice(0, 5)),
        ...(safeFeatured.length > 0 ? [itemListSchema(safeFeatured, "Featured Industrial Picks", `${SITE_URL}/products?filter=featured`)] : []),
        ...(safeBestSellers.length > 0 ? [itemListSchema(safeBestSellers, "Best Selling Products", `${SITE_URL}/products?filter=best-seller`)] : []),
      ]} />

      {/* Decorative Floating Brand blurs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-red-500/[0.015] rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-indigo-500/[0.015] rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-[800px] h-[800px] bg-amber-500/[0.012] rounded-full blur-[175px] pointer-events-none -z-10" />

      {/* Main Banner Slider */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-4 bg-transparent">
        <BannerCarousel banners={safeBanners} />
      </section>

      {/* Interactive Category Selector Selector */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4">
        <CategorySelector categories={safeCategories} />
      </section>

      {/* Trust & Value Proposition */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-8 mt-4">
        <WhyChooseUs />
      </section>

      {/* Flash Sale Carousel */}
      {safeFlashDeals.length > 0 && (
        <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
          <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
            <div className="relative pl-4 border-l-4 border-primary">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Flash Sale</p>
              <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Industrial Deals of the Week</h2>
            </div>
            <Link
              href="/products?filter=on-sale"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
            >
              View all deals <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ProductCarousel products={safeFlashDeals} />
        </section>
      )}

      {/* Deal 1: After Flash Sale */}
      {safeDeals[0] && (
        <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
          <div className="hover:scale-[1.005] transition-transform duration-500">
            <DealBanner
              title={safeDeals[0].title}
              subtitle={safeDeals[0].description}
              linkText="Claim Offer"
              linkUrl={safeDeals[0].link_url}
              imageUrl={safeDeals[0].image_url}
              gradient="from-zinc-950 via-zinc-900 to-zinc-950"
            />
          </div>
        </section>
      )
      }

      {/* Primary Category Deck */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
        <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
          <div className="relative pl-4 border-l-4 border-primary">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Categories</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Browse your product categories</h2>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
          >
            View all categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dynamic Curved Glass category cards */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {safeCategories
            .filter((c) => !c.parent_id)
            .map((category) => (
              <Link
                key={category.id}
                href={`/search?main=${category.slug}`}
                className="bg-white overflow-hidden"
              >
                {/* Image */}
                <div className="relative h-40 w-full bg-zinc-50">
                  {
                    category.image_url ? (
                      <Image
                        src={category.image_url}
                        alt={category.name}
                        fill
                        className="object-cover rounded-md transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FolderTree className="h-10 w-10 text-zinc-400" />
                      </div>
                    )
                  }
                </div>

                {/* Text */}
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-sm text-zinc-800 group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
        </div>
      </section >

      {/* Deal 2: After Categories */}
      {
        safeDeals[1] && (
          <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
            <div className="hover:scale-[1.005] transition-transform duration-500">
              <DealBanner
                title={safeDeals[1].title}
                subtitle={safeDeals[1].description}
                linkText="Bulk Offer"
                linkUrl={safeDeals[1].link_url}
                imageUrl={safeDeals[1].image_url}
                gradient="from-zinc-900 via-zinc-950 to-zinc-900"
              />
            </div>
          </section>

        )
      }

      {/* Featured Products Segment */}
      {
        safeFeatured.length > 0 && (
          <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
            <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
              <div className="relative pl-4 border-l-4 border-primary">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Handpicked</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Featured Industrial Picks</h2>
              </div>
              <Link
                href="/products?filter=featured"
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
              >
                Browse featured <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ProductCarousel products={safeFeatured} />
          </section>
        )
      }

      {/* Deal 3: After Featured */}
      {
        safeDeals[2] && (
          <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
            <div className="hover:scale-[1.005] transition-transform duration-500">
              <DealBanner
                title={safeDeals[2].title}
                subtitle={safeDeals[2].description}
                linkText="New Arrivals"
                linkUrl={safeDeals[2].link_url}
                imageUrl={safeDeals[2].image_url}
                gradient="from-zinc-950 via-zinc-900 to-zinc-950"
              />
            </div>
          </section>
        )
      }

      {/* Best Sellers Segment */}
      {
        safeBestSellers.length > 0 && (
          <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
            <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
              <div className="relative pl-4 border-l-4 border-primary">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Popular</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Our Best Sellers</h2>
              </div>
              <Link
                href="/products?filter=best-seller"
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
              >
                Browse sellers <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ProductCarousel products={safeBestSellers} />
          </section>
        )
      }

      {/* Testimonials */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-8 mt-4">
        <Testimonials />
      </section>

      {/* Top Selling Products Segment */}
      {
        safeTopSelling.length > 0 && (
          <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
            <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
              <div className="relative pl-4 border-l-4 border-primary">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Trending Demands</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Top Selling Products</h2>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
              >
                View all products <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ProductCarousel products={safeTopSelling} />
          </section>
        )
      }

      {
        [
          { products: safeNewArrivals, tag: "Fresh", title: "New Arrivals", href: "/products?filter=new-arrival" },
          { products: safeTrending, tag: "Market Trend", title: "Trending Now", href: "/products?filter=trending" },
        ].map((section, idx) => section.products.length > 0 && (
          <section key={idx} className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
            <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
              <div className="relative pl-4 border-l-4 border-primary">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{section.tag}</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">{section.title}</h2>
              </div>
              <Link
                href={section.href}
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
              >
                Browse all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ProductCarousel products={section.products} />
          </section>
        ))
      }

      {/* Personalised sections — only visible to returning visitors */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto">
        <RecentlyViewedProducts maxItems={8} />
        <RecommendedProducts maxItems={8} />
      </section>



      {/* FAQ Accordion Section */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-10">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs font-medium text-zinc-500 max-w-md mx-auto">
            Find quick answers to common queries about ordering, shipping, custom quotes, and product quality.
          </p>
        </div>

        <FAQAccordion items={faqItems.slice(0, 5)} className="max-w-3xl mx-auto" />

        <div className="text-center mt-10">
          <Link
            href="/faq"
            className="inline-flex items-center justify-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800 active:scale-95 transition-all text-xs font-bold px-6 py-3.5 rounded-xl shadow-sm uppercase tracking-wider"
          >
            View All FAQs
          </Link>
        </div>
      </section>

      {/* Trusted Brands Grid (highly stylized cards) */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Our Trusted Partners</h2>
          <div className="w-12 h-1 bg-primary mx-auto rounded-full" />
        </div>

        {/* Infinite Scrolling Marquee Container */}
        <div className="relative w-full overflow-hidden py-6">
          <style>{`
    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }
    .animate-marquee-infinite {
      display: flex;
      width: max-content;
      gap: 40px; /* Increased gap slightly for better breathing room without borders */
      animation: marquee 30s linear infinite;
    }
    .animate-marquee-infinite:hover {
      animation-play-state: paused;
    }
  `}</style>

          <div className="animate-marquee-infinite items-center">
            {/* Duplicated array to ensure perfect seamless looping */}
            {[
              { name: "Sigma", logo: "/trusted-partner/SIGMA.webp" },
              { name: "Merck", logo: "/trusted-partner/MERCK.webp" },
              { name: "Borosil", logo: "/trusted-partner/Borosil.webp" },
              { name: "Blue Star", logo: "/trusted-partner/blueStar.webp" },
              { name: "Remi", logo: "/trusted-partner/Remi.webp" },
              { name: "Sigma", logo: "/trusted-partner/SIGMA.webp" },
              { name: "Merck", logo: "/trusted-partner/MERCK.webp" },
              { name: "Borosil", logo: "/trusted-partner/Borosil.webp" },
              { name: "Blue Star", logo: "/trusted-partner/blueStar.webp" },
              { name: "Remi", logo: "/trusted-partner/Remi.webp" },
              { name: "Sigma", logo: "/trusted-partner/SIGMA.webp" },
              { name: "Merck", logo: "/trusted-partner/MERCK.webp" },
              { name: "Borosil", logo: "/trusted-partner/Borosil.webp" },
              { name: "Blue Star", logo: "/trusted-partner/blueStar.webp" },
              { name: "Remi", logo: "/trusted-partner/Remi.webp" },
              { name: "Sigma", logo: "/trusted-partner/SIGMA.webp" },
              { name: "Merck", logo: "/trusted-partner/MERCK.webp" },
              { name: "Borosil", logo: "/trusted-partner/Borosil.webp" },
              { name: "Blue Star", logo: "/trusted-partner/blueStar.webp" },
              { name: "Remi", logo: "/trusted-partner/Remi.webp" }
            ].map((brand, i) => (
              <div
                key={`${brand.name}-${i}`}
                className="group relative w-36 h-36 flex items-center justify-center shrink-0"
              >
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  fill
                  sizes="150px"
                  className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div >
  );
}
