import type { Metadata } from "next";

export const SITE_URL = "https://uc-enterprises.vercel.app";
export const SITE_NAME = "UC Enterprises";
export const SITE_DESCRIPTION =
  "UC Enterprises — India's trusted supplier of laboratory chemicals, glassware, safety equipment, industrial tools & electrical goods. Wholesale pricing, pan-India delivery.";
export const SITE_TWITTER = "@ucenterprises";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

// ─── Canonical URL helper ───────────────────────────────────────────────────
export function canonicalUrl(path: string): string {
  // Strip trailing slash, keep leading slash
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return `${SITE_URL}${clean}`;
}

// ─── Base metadata shared across all pages ──────────────────────────────────
export function baseMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    appleWebApp: {
      title: SITE_NAME,
      statusBarStyle: "default",
    },
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: [
      "laboratory chemicals",
      "lab glassware",
      "industrial equipment",
      "safety equipment",
      "PPE",
      "chemical reagents",
      "laboratory supplies India",
      "industrial tools",
      "scientific equipment",
      "UC Enterprises",
    ],
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: SITE_URL,
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — Laboratory & Industrial Supplies`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE_TWITTER,
      creator: SITE_TWITTER,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [OG_IMAGE],
    },
    alternates: {
      canonical: SITE_URL,
    },
    verification: {
      // Add your Google Search Console verification token here when available
      // google: "YOUR_VERIFICATION_TOKEN",
    },
    ...overrides,
  };
}

// ─── Homepage metadata ───────────────────────────────────────────────────────
export function homepageMetadata(): Metadata {
  return baseMetadata({
    title: `${SITE_NAME} — Laboratory, Industrial & Safety Supplies India`,
    description: SITE_DESCRIPTION,
    alternates: { canonical: SITE_URL },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: SITE_URL,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Laboratory, Industrial & Safety Supplies India`,
      description: SITE_DESCRIPTION,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
  });
}

// ─── Product metadata ────────────────────────────────────────────────────────
interface ProductMetaInput {
  name: string;
  slug: string;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  price: number;
  sale_price?: number | null;
  image_url?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  inStock?: boolean;
}

export function productMetadata(p: ProductMetaInput): Metadata {
  const price = p.sale_price ?? p.price;
  const priceStr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

  const title = p.seo_title || `${p.name}${p.brandName ? ` by ${p.brandName}` : ""}${p.categoryName ? ` — ${p.categoryName}` : ""}`;
  const description =
    p.seo_description ||
    p.description?.slice(0, 155) ||
    `Buy ${p.name}${p.categoryName ? ` (${p.categoryName})` : ""} at ${priceStr}. ${p.inStock ? "In stock" : "Available to order"} — fast pan-India delivery from UC Enterprises.`;

  const url = canonicalUrl(`/products/${p.slug}`);
  const image = normalizeSeoImageUrl(p.image_url) || OG_IMAGE;

  return baseMetadata({
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: image, width: 800, height: 800, alt: p.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  });
}

// ─── Category metadata ────────────────────────────────────────────────────────
function normalizeSeoImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\/(?:encrypted-tbn\d*\.gstatic\.com|.*\.gstatic\.com|.*googleusercontent\.com)/i.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return `${SITE_URL}${trimmed}`;
  }

  return trimmed;
}

interface CategoryMetaInput {
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  productCount?: number;
  page?: number;
}

export function categoryMetadata(c: CategoryMetaInput): Metadata {
  const page = c.page || 1;
  const isFirstPage = page <= 1;

  const title = page > 1 
    ? `${c.name} — Page ${page}`
    : `${c.name} — Buy Online at Best Price`;

  const description =
    c.description?.slice(0, 155) ||
    `Shop ${c.name} from UC Enterprises. ${c.productCount ? `${c.productCount}+ products` : "Wide range"} with competitive wholesale pricing and pan-India delivery.`;
  
  const url = canonicalUrl(`/categories/${c.slug}`);
  const image = normalizeSeoImageUrl(c.image_url) || OG_IMAGE;

  return baseMetadata({
    title,
    description,
    alternates: { canonical: url },
    robots: isFirstPage
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: image, width: 800, height: 600, alt: c.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  });
}

// ─── Products listing metadata (pagination aware) ────────────────────────────
export function productsListingMetadata(page: number, sort: string): Metadata {
  const isFirstPage = page <= 1 && sort === "latest";
  const title =
    page > 1
      ? `All Products — Page ${page}`
      : "All Products — Laboratory Chemicals, Glassware & Industrial Supplies";
  const description =
    "Browse UC Enterprises' complete product catalogue: laboratory chemicals, reagents, glassware, safety equipment, industrial tools and electrical goods. Wholesale pricing for B2B buyers across India.";
  const url = canonicalUrl("/products");

  return baseMetadata({
    title,
    description,
    // Canonicalize all paginated/sorted variants to the base listing URL
    alternates: { canonical: url },
    robots: isFirstPage
      ? { index: true, follow: true }
      : { index: false, follow: true },
  });
}

// ─── Static page metadata ────────────────────────────────────────────────────
export const staticPageMetadata: Record<string, Metadata> = {
  about: baseMetadata({
    title: "About UC Enterprises — India's Trusted Lab & Industrial Supplier",
    description:
      "Learn about UC Enterprises — established in 2018, serving laboratories, industries, hospitals and institutions across India with quality chemicals, glassware, tools and safety products.",
    alternates: { canonical: canonicalUrl("/about") },
  }),

  contact: baseMetadata({
    title: "Contact UC Enterprises — Sales, Support & Bulk Enquiries",
    description:
      "Contact UC Enterprises for sales enquiries, bulk orders, product documentation or technical support. Call +91 98888 63377 or email ucenterprises1@gmail.com. Mon–Sat, 9am–6pm.",
    alternates: { canonical: canonicalUrl("/contact") },
  }),

  faq: baseMetadata({
    title: "FAQ — Ordering, Shipping & Product Questions",
    description:
      "Answers to common questions about ordering laboratory supplies, shipping timelines, product certifications, returns and bulk pricing at UC Enterprises.",
    alternates: { canonical: canonicalUrl("/faq") },
  }),

  privacyPolicy: baseMetadata({
    title: "Privacy Policy",
    description:
      "UC Enterprises privacy policy — how we collect, use and protect your personal data in compliance with India's Digital Personal Data Protection Act (DPDP) 2023.",
    alternates: { canonical: canonicalUrl("/privacy-policy") },
    robots: { index: true, follow: false },
  }),

  termsOfService: baseMetadata({
    title: "Terms of Service",
    description:
      "UC Enterprises terms and conditions — governing purchases, shipping, returns, and use of our B2B eCommerce platform.",
    alternates: { canonical: canonicalUrl("/terms-of-service") },
    robots: { index: true, follow: false },
  }),

  cookiePolicy: baseMetadata({
    title: "Cookie Policy",
    description:
      "How UC Enterprises uses cookies to improve your browsing experience and secure your session.",
    alternates: { canonical: canonicalUrl("/cookie-policy") },
    robots: { index: true, follow: false },
  }),

  deals: baseMetadata({
    title: "Current Deals & Offers — Laboratory & Industrial Supplies",
    description:
      "Explore active deals and limited-time offers on laboratory chemicals, glassware and industrial equipment at UC Enterprises.",
    alternates: { canonical: canonicalUrl("/deals") },
  }),
};

// ─── Noindex metadata for private/thin pages ─────────────────────────────────
export const noindexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
