import type { Metadata } from "next";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/jsonld";
import PolicyLayout from "@/components/storefront/PolicyLayout";
import CookiePreferencesManager from "@/components/storefront/CookiePreferencesManager";

export const metadata: Metadata = staticPageMetadata.cookiePolicy;

const SECTIONS = [
  { id: "what-are-cookies", title: "1. What Are Cookies" },
  { id: "how-we-use-cookies", title: "2. How We Use Cookies" },
  { id: "cookie-categories", title: "3. Cookie Categories" },
  { id: "your-preferences", title: "4. Your Preferences" },
];

export default function CookiePolicyPage() {
  return (
    <>
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

      <PolicyLayout
        title="Cookie Policy"
        subtitle="Cookie Preferences and Consent Controls"
        lastUpdated="May 16, 2026"
        sections={SECTIONS}
      >
        <section id="what-are-cookies" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            1. What Are Cookies
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            Cookies are small text files stored on your computer or mobile device by websites you visit. They are widely used to make websites work more efficiently, provide custom features, and send usage data to site administrators.
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            Cookies can be "persistent" (remaining on your device after you close your browser, used to remember login states) or "session" cookies (deleted automatically when your browser closes).
          </p>
        </section>

        <section id="how-we-use-cookies" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            2. How We Use Cookies
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            UC Enterprises uses cookies for storefront stability, security, and tracking. Specifically, cookies help us:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-650 font-semibold">
            <li>Verify your identity and keep you logged into your account as you navigate between pages.</li>
            <li>Maintain your active shopping cart state and checkout choices.</li>
            <li>Protect our platform against spam, CSRF attacks, and unauthorized API queries.</li>
            <li>Track page performance, site speed, and navigation choices so we can resolve bottlenecks.</li>
          </ul>
        </section>

        <section id="cookie-categories" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            3. Cookie Categories
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            The cookies we use are classified into three core types:
          </p>

          <div className="overflow-x-auto border border-zinc-200 rounded-2xl mb-4">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-xs font-semibold">
              <thead className="bg-zinc-50 uppercase text-[9px] tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Lifespan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-700 bg-white">
                <tr>
                  <td className="px-4 py-3.5 font-bold">Essential</td>
                  <td className="px-4 py-3.5 leading-relaxed">Authentication sessions, security tokens, and cart state. (Mandatory)</td>
                  <td className="px-4 py-3.5">Session / 30 Days</td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-bold">Analytics</td>
                  <td className="px-4 py-3.5 leading-relaxed">Page views count, loading speeds, and customer navigation patterns. (Optional)</td>
                  <td className="px-4 py-3.5">1 Year</td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-bold">Marketing</td>
                  <td className="px-4 py-3.5 leading-relaxed">Customizing deal banners and product catalog suggestions matching your business. (Optional)</td>
                  <td className="px-4 py-3.5">6 Months</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="your-preferences" className="mb-6">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            4. Your Preferences
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-6">
            You can review, save, or revoke your optional cookie permissions (Analytics and Marketing) at any time. Toggling preferences below will update your settings instantly.
          </p>
          
          <CookiePreferencesManager />
        </section>
      </PolicyLayout>
    </>
  );
}
