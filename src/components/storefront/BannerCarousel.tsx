"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, PhoneCall, ShieldCheck } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  link_url?: string;
  link_text?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentBanner, setCurrentBanner] = useState(0);

  // Auto-slide banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 6000); // Relaxed to 6s for better readability of multi-line Indian business titles
    return () => clearInterval(interval);
  }, [banners.length]);

  const goToBanner = useCallback((index: number) => setCurrentBanner(index), []);
  const prevBanner = useCallback(
    () => setCurrentBanner((p) => (p - 1 + banners.length) % banners.length),
    [banners.length]
  );
  const nextBanner = useCallback(
    () => setCurrentBanner((p) => (p + 1) % banners.length),
    [banners.length]
  );

  {/* Empty State / Default Fallback Banner */ }
  if (banners.length === 0) {
    return (
      <div data-nosnippet className="relative overflow-hidden rounded-sm border border-slate-200 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white md:p-16 lg:col-span-2 shadow-sm min-h-[350px] md:min-h-[450px] flex flex-col justify-center">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute left-10 bottom-0 h-44 w-44 rounded-full bg-amber-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400 border border-blue-500/20">
            🇮🇳 Verified B2B Marketplace
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3 w-3" /> 100% GST Invoice
          </span>
        </div>

        <h1 className="relative z-10 max-w-2xl text-3xl font-extrabold tracking-tight md:text-5xl leading-tight text-white">
          Industrial Supplies, Chemicals & Labware. <span className="text-amber-400">Direct Bulk Rates.</span>
        </h1>

        <p className="relative z-10 mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
          Simplify your corporate procurement. Access real-time pricing on lakhs of items, claim valid input tax credits, and secure paneled logistics routes across India.
        </p>

        <div className="relative z-10 mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all hover:scale-[1.01]"
          >
            Explore Catalog
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="tel:+911234567890"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors ml-2"
          >
            <PhoneCall className="h-3.5 w-3.5" /> Speak to Expert
          </a>
        </div>
      </div>
    );
  }

  return (
    <div data-nosnippet className="relative overflow-hidden rounded-md lg:col-span-2 group">
      {/* Slides */}
      <div className="relative aspect-[16/9] sm:aspect-auto sm:h-[350px] md:h-[450px]">
        {banners.map((banner, index) => {
          const slideContent = (
            <>
              {/* Background Graphic Strategy */}
              {banner.image_url ? (
                <div className="absolute inset-0">
                  <Image
                    src={banner.image_url}
                    alt={banner.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
                    className="w-full h-full object-cover"
                    priority={index === 0}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-blue-950">
                  <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
                  <div className="absolute left-1/3 bottom-0 h-44 w-44 rounded-full bg-amber-500/5 blur-2xl" />
                </div>
              )}
            </>
          );

          return (
            <div
              key={banner.id}
              className="absolute inset-0 transition-all duration-700 ease-in-out"
              style={{
                opacity: index === currentBanner ? 1 : 0,
                transform: index === currentBanner ? "scale(1)" : "scale(1.02)",
                zIndex: index === currentBanner ? 10 : 1,
              }}
            >
              {banner.link_url ? (
                <Link href={banner.link_url} className="absolute inset-0 block cursor-pointer">
                  {slideContent}
                </Link>
              ) : (
                slideContent
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Highly visible handles optimized for touch/desktop hybrid layouts) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevBanner}
            aria-label="Previous Banner"
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-white md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-slate-900 hover:text-amber-400"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
          <button
            onClick={nextBanner}
            aria-label="Next Banner"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-white md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-slate-900 hover:text-amber-400"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        </>
      )}

      {/* Modern Active Indicator Bar Pill-Toggles */}
      {banners.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-800/40">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToBanner(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === currentBanner
                ? "w-6 bg-amber-500"
                : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
