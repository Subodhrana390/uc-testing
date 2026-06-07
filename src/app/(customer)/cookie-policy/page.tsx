import type { Metadata } from "next";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/jsonld";

export const metadata: Metadata = staticPageMetadata.cookiePolicy;

export default function CookiePolicyPage() {
  return (
    <div className="bg-white">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Cookie Policy", url: `${SITE_URL}/cookie-policy` },
        ]),
        webPageSchema({
          name: "Cookie Policy",
          description: "How UC Enterprises uses cookies to improve your browsing experience.",
          url: `${SITE_URL}/cookie-policy`,
          type: "WebPage",
        }),
      ]} />
      <section className="container mx-auto max-w-4xl px-4 py-14">
        <h1 className="text-4xl font-black tracking-tight text-zinc-950">Cookie Policy</h1>
        <p className="mt-6 text-sm leading-7 text-zinc-600">
          UC Enterprises uses essential cookies for authentication, session continuity, and storefront reliability. These cookies help maintain secure
          login state for customer and admin experiences.
        </p>
      </section>
    </div>
  );
}
