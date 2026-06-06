import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UC Enterprises",
    short_name: "UC Enterprises",
    description:
      "Laboratory chemicals, glassware, safety equipment & industrial supplies — pan-India delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316",
    orientation: "portrait-primary",
    categories: ["shopping", "business", "science"],
    lang: "en-IN",
    icons: [
      {
        src: "/favicon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "All Products",
        url: "/products",
        description: "Browse all laboratory and industrial products",
      },
      {
        name: "Categories",
        url: "/categories",
        description: "Browse product categories",
      },
      {
        name: "Current Deals",
        url: "/deals",
        description: "View active deals and offers",
      },
    ],
  };
}
