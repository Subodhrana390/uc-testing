import { SITE_URL, SITE_NAME } from "./seo";

// ─── Types ───────────────────────────────────────────────────────────────────
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface ProductInput {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  sale_price?: number | null;
  image_url?: string | null;
  images?: string[];
  status?: string;
  stock_quantity?: number;
  sku?: string | null;
  averageRating?: number | string;
  reviewCount?: number;
  brandName?: string | null;
  categoryName?: string | null;
}

interface ProductListItem {
  name: string;
  slug: string;
  image_url?: string | null;
}

// ─── Organization Schema ─────────────────────────────────────────────────────
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-98888-63377",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
        contactOption: "TollFree",
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "09:00",
          closes: "18:00",
        },
      },
    ],
    email: "ucenterprises1@gmail.com",
    foundingDate: "2018",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Shop No. 1, Khairabad Village, Near Bus Stand, Bela Road",
      addressLocality: "Khairabad, Ropar",
      addressRegion: "Punjab",
      postalCode: "140001",
      addressCountry: "IN",
    },
    sameAs: [],
    description:
      "UC Enterprises is India's trusted supplier of laboratory chemicals, reagents, glassware, safety equipment, industrial tools and electrical goods since 2018.",
  };
}

// ─── WebSite Schema (enables Sitelinks Searchbox) ────────────────────────────
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description:
      "Laboratory chemicals, glassware, safety equipment and industrial supplies — pan-India delivery.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-IN",
  };
}

// ─── LocalBusiness Schema ─────────────────────────────────────────────────────
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Store"],
    "@id": `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: SITE_URL,
    telephone: "+91-98888-63377",
    email: "ucenterprises1@gmail.com",
    image: `${SITE_URL}/logo.png`,
    logo: `${SITE_URL}/logo.png`,
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, Credit Card, Debit Card, UPI, Net Banking",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Shop No. 1, Khairabad Village, Near Bus Stand, Bela Road",
      addressLocality: "Khairabad",
      addressRegion: "Punjab",
      postalCode: "140001",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 30.9616,
      longitude: 76.5324,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    description:
      "UC Enterprises supplies laboratory chemicals, glassware, safety equipment and industrial tools across India with competitive wholesale pricing.",
    foundingDate: "2018",
    hasMap: "https://maps.google.com/?q=Khairabad+Ropar+Punjab+India",
  };
}

// ─── Product Schema ──────────────────────────────────────────────────────────
export function productSchema(p: ProductInput) {
  const url = `${SITE_URL}/products/${p.slug}`;
  const price = p.sale_price ?? p.price;
  const inStock =
    p.status === "Active" && (p.stock_quantity === undefined || p.stock_quantity > 0);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    url,
    description:
      p.description ||
      `${p.name}${p.categoryName ? ` — ${p.categoryName}` : ""} available at UC Enterprises. Pan-India delivery with competitive pricing.`,
    sku: p.sku || p.id,
    image: p.images?.length
      ? p.images.map((img) => ({ "@type": "ImageObject", url: img }))
      : p.image_url
      ? [{ "@type": "ImageObject", url: p.image_url }]
      : [`${SITE_URL}/images/prod_main.png`],
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    manufacturer: p.brandName
      ? { "@type": "Organization", name: p.brandName }
      : undefined,
    brand: p.brandName
      ? { "@type": "Brand", name: p.brandName }
      : { "@type": "Brand", name: SITE_NAME },
    category: p.categoryName || undefined,
  };

  if (p.reviewCount && p.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(p.averageRating || 0),
      reviewCount: p.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  // Remove undefined keys
  return JSON.parse(JSON.stringify(schema));
}

// ─── BreadcrumbList Schema ────────────────────────────────────────────────────
export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── FAQ Schema ──────────────────────────────────────────────────────────────
export function faqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// ─── ItemList Schema (for category / listing pages) ───────────────────────────
export function itemListSchema(
  products: ProductListItem[],
  listName: string,
  listUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    url: listUrl,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.name,
      image: p.image_url || `${SITE_URL}/images/prod_main.png`,
    })),
  };
}

// ─── Webpage Schema ────────────────────────────────────────────────────────────
export function webPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  type?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": opts.type || "WebPage",
    "@id": `${opts.url}#webpage`,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-IN",
  };
}
