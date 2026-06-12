import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // The Host directive requires just the domain name, not the full URL scheme
  const hostDomain = new URL(SITE_URL).host;

  return {
    rules: [
      {
        // Use wildcard to allow all search engines, AI crawlers, and general bots
        // unless explicitly disallowed below or in subsequent rules.
        userAgent: "*",
        allow: "/",
        disallow: [
          "/uc-admin-portal/",
          "/api/",
          "/checkout/",
          "/cart/",
          "/account/",
          "/search/",
          "/*?q=*", // Block internal search queries from indexation to save crawl budget
          "/_next/",
        ],
      },
      // Block known scrapers and aggressive SEO tools
      {
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: hostDomain,
  };
}
