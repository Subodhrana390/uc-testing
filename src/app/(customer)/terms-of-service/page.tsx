import type { Metadata } from "next";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/jsonld";

export const metadata: Metadata = staticPageMetadata.termsOfService;

export default function TermsOfServicePage() {
  return (
    <div className="bg-white">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Terms of Service", url: `${SITE_URL}/terms-of-service` },
        ]),
        webPageSchema({
          name: "Terms of Service",
          description: "UC Enterprises terms and conditions governing purchases, shipping, returns.",
          url: `${SITE_URL}/terms-of-service`,
          type: "WebPage",
        }),
      ]} />
      <section className="container mx-auto max-w-4xl px-4 py-14">
        <h1 className="text-4xl font-black tracking-tight text-zinc-950">Terms of Service</h1>
        <p className="mt-6 text-sm leading-7 text-zinc-600">
          Prices, availability, dispatch timelines, and warranty terms may vary by product category and order volume. Final commercial terms for bulk
          orders are confirmed during quote acceptance or invoice generation.
        </p>
      </section>
    </div>
  );
}
