import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FolderTree, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import CategorySelector from "@/components/storefront/CategorySelector";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import DealBanner from "@/components/storefront/DealBanner";
import JsonLd from "@/components/seo/JsonLd";
import { faqSchema, itemListSchema, webPageSchema } from "@/lib/jsonld";
import { homepageMetadata, SITE_URL } from "@/lib/seo";
import dynamic from "next/dynamic";
import { getDynamicSections } from "@/app/actions/productAnalytics";

const RecentlyViewedProducts = dynamic(() => import("@/components/storefront/RecentlyViewedProducts"));
const RecommendedProducts = dynamic(() => import("@/components/storefront/RecommendedProducts"));
const ProductCarousel = dynamic(() => import("@/components/storefront/ProductCarousel"));
const FAQAccordion = dynamic(() => import("@/components/storefront/FAQAccordion"));

const Testimonials = dynamic(() => import("@/components/storefront/Testimonials"));


export const metadata: Metadata = homepageMetadata();

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { flashDeals, newArrivals, featuredProducts, sections },
    { data: categories },
    { data: parentCategories },
    { data: banners },
    { data: deals },
    { data: faqs }
  ] = await Promise.all([
    getDynamicSections(),
    supabase.from("categories").select("id, name, slug, parent_id,image_url").eq("status", true).order("name", { ascending: true }),
    supabase.from("categories").select("id, name, slug, parent_id,image_url").eq("status", true).is("parent_id", null).order("name", { ascending: true }).limit(8),
    supabase.from("banners").select("*").eq("status", true).order("position", { ascending: true }),
    supabase.from("deals").select("*").eq("status", true).order("position", { ascending: true }),
    supabase.from("faqs").select("id, question, answer, category").eq("is_published", true).order("sort_order", { ascending: true })
  ]);

  const safeCategories = categories || [];
  const safeParentCategories = parentCategories || [];
  const safeBanners = banners || [];

  const safeFlashDeals = flashDeals || [];
  const safeDeals = ((deals as any[]) || []).filter((d) => {
    if (d.start_date && new Date(d.start_date) > new Date()) return false;
    if (d.end_date && new Date(d.end_date) < new Date()) return false;
    return true;
  });
  const safeFaqs = faqs || [];

  // Load promotional campaigns directly from the database table managed via the admin portal
  const deal1 = safeDeals[0];
  const deal2 = safeDeals[1];

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
        faqSchema(safeFaqs.slice(0, 5)),
        ...(sections[0] ? [itemListSchema(sections[0].products, sections[0].title, `${SITE_URL}${sections[0].href}`)] : []),
        ...(sections[1] ? [itemListSchema(sections[1].products, sections[1].title, `${SITE_URL}${sections[1].href}`)] : []),
      ]} />

      {/* Decorative Floating Brand blurs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-red-500/[0.015] rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-indigo-500/[0.015] rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-[800px] h-[800px] bg-amber-500/[0.012] rounded-full blur-[175px] pointer-events-none -z-10" />

      {/* Main Banner Slider */}
      <section className="w-full bg-transparent">
        <BannerCarousel banners={safeBanners} />
      </section>

      {/* Interactive Category Selector Selector */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4">
        <CategorySelector categories={safeCategories} />
      </section>



      {/* Flash Sale Carousel */}
      {safeFlashDeals.length > 0 && (
        <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
          <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
            <div className="relative pl-4 border-l-4 border-primary">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Flash Sale</p>
              <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Industrial Deals of the Week</h2>
            </div>
            <Link prefetch={false}
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
      {deal1 && (
        <section className="w-full py-8">
          <DealBanner
            title={deal1.title}
            subtitle={deal1.description}
            linkText={deal1.badge_text || "Claim Offer"}
            linkUrl={deal1.link_url}
            imageUrl={deal1.image_url}
            gradient="from-zinc-950 via-zinc-900 to-zinc-950"
          />
        </section>
      )}

      {/* Primary Category Deck */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
        <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
          <div className="relative pl-4 border-l-4 border-primary">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Categories</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Browse your product categories</h2>
          </div>
          <Link prefetch={false}
            href="/categories"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
          >
            View all categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dynamic Curved Glass category cards */}
        <div className="flex overflow-x-auto md:grid gap-5 md:grid-cols-3 lg:grid-cols-6 pb-4 md:pb-0 custom-scrollbar">
          {safeParentCategories
            .map((category) => (
              <Link prefetch={false}
                key={category.id}
                href={`/categories/${category.slug}`}
                className="bg-white overflow-hidden w-[160px] md:w-auto shrink-0 md:shrink group"
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
      {deal2 && (
        <section className="w-full py-8">
          <DealBanner
            title={deal2.title}
            subtitle={deal2.description}
            linkText={deal2.badge_text || "Bulk Offer"}
            linkUrl={deal2.link_url}
            imageUrl={deal2.image_url}
            gradient="from-zinc-900 via-zinc-950 to-zinc-900"
          />
        </section>
      )}

      {/* New Arrivals Section */}
      {newArrivals && newArrivals.length > 0 && (
        <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
          <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
            <div className="relative pl-4 border-l-4 border-primary">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Fresh</p>
              <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">New Arrivals</h2>
            </div>
            <Link prefetch={false}
              href="/products?sort=latest"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
            >
              Browse all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ProductCarousel products={newArrivals} />
        </section>
      )}

      {/* Featured Products Section */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
          <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
            <div className="relative pl-4 border-l-4 border-primary">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Curated</p>
              <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Featured Products</h2>
            </div>
            <Link prefetch={false}
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
            >
              Browse all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ProductCarousel products={featuredProducts} />
        </section>
      )}

      {/* Dynamic Rendered Sections */}
      {sections.map((section, idx) => (
        <React.Fragment key={section.id}>
          <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-2 lg:px-4 py-8">
            <div className="mb-8 flex items-end justify-between border-b border-zinc-100 pb-5">
              <div className="relative pl-4 border-l-4 border-primary">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{section.tag}</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">{section.title}</h2>
              </div>
              <Link prefetch={false}
                href={section.href}
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-red-700 transition-colors"
              >
                Browse all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ProductCarousel products={section.products} />
          </section>

          {/* Inject dynamic deals after sections (Deal 3, 4, 5, 6 etc.) */}
          {safeDeals[2 + idx] && (
            <section className="w-full py-8">
              <DealBanner
                title={safeDeals[2 + idx].title}
                subtitle={safeDeals[2 + idx].description}
                linkText={safeDeals[2 + idx].badge_text || "Explore Offer"}
                linkUrl={safeDeals[2 + idx].link_url}
                imageUrl={safeDeals[2 + idx].image_url}
                gradient={idx % 2 === 0 ? "from-zinc-950 via-zinc-900 to-zinc-950" : "from-zinc-900 via-zinc-950 to-zinc-900"}
              />
            </section>
          )}

        </React.Fragment>
      ))}

      {/* Personalised sections — only visible to returning visitors */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto">
        <RecentlyViewedProducts maxItems={8} />
        <RecommendedProducts maxItems={8} />
      </section>

      {/* Testimonials Section */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-8 mt-4">
        <Testimonials />
      </section>



      {/* FAQ Accordion Section */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-10">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs font-medium text-zinc-500 max-w-md mx-auto">
            Find quick answers to common queries about ordering, shipping, custom quotes, and product quality.
          </p>
        </div>

        <FAQAccordion items={safeFaqs.slice(0, 5)} className="max-w-3xl mx-auto" />

        <div className="text-center mt-10">
          <Link prefetch={false}
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
