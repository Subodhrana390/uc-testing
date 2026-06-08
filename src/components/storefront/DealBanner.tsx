import Link from "next/link";
import { ArrowRight, BadgePercent } from "lucide-react";
import Image from "next/image";

interface DealBannerProps {
  title: string;
  subtitle: string;
  linkText: string;
  linkUrl: string;
  imageUrl?: string;
  gradient?: string;
}

export default function DealBanner({
  title,
  subtitle,
  linkText,
  linkUrl,
  imageUrl,
  gradient = "from-zinc-900 via-zinc-800 to-zinc-950"
}: DealBannerProps) {
  return (
    <div data-nosnippet className={`relative overflow-hidden rounded-md bg-gradient-to-r ${gradient} p-10 md:p-16 shadow-2xl min-h-[450px] flex items-center`}>
      {/* Background Image Strategy */}
      {imageUrl && (
        <div className="absolute inset-0 z-0">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
            className="w-full h-full object-cover object-center"
          />
          {/* Advanced localized lighting protection overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-transparent md:from-zinc-950/90 md:via-zinc-950/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60 md:opacity-20" />
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl z-0" />
      <div className="absolute left-1/4 bottom-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl z-0" />

      {/* Banner Layout Content */}
      <div className="relative z-10 max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
          <BadgePercent className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Limited Time Offer</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
          {title}
        </h2>

        <p className="text-zinc-300 text-sm md:text-base leading-relaxed max-w-md [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
          {subtitle}
        </p>

        <div className="pt-2">
          <Link
            href={linkUrl}
            className="inline-flex items-center gap-3 bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-zinc-950 shadow-xl transition-all hover:bg-primary hover:text-white group"
          >
            {linkText}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
