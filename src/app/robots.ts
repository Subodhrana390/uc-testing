import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://uc-enterprises.vercel.app";

  return {
    rules: [
      // Allow all well-behaved bots including AI crawlers
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "Slurp",
          "DuckDuckBot",
          "Baiduspider",
          "YandexBot",
          "facebot",
          "ia_archiver",
          // AI search crawlers — allow for AEO/GEO optimization
          "GPTBot",
          "Google-Extended",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "cohere-ai",
        ],
        allow: "/",
        disallow: [
          "/uc-admin-portal",
          "/uc-admin-portal/",
          "/api/",
          "/checkout",
          "/checkout/",
          "/cart",
          "/account",
          "/account/",
          "/_next/",
        ],
      },
      // Disallow scrapers and bad bots
      {
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot"],
        disallow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
