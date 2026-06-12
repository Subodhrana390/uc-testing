import type { Metadata } from "next";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/jsonld";
import PolicyLayout from "@/components/storefront/PolicyLayout";

export const metadata: Metadata = staticPageMetadata.privacyPolicy;

const SECTIONS = [
  { id: "introduction", title: "1. Introduction" },
  { id: "data-collection", title: "2. Data We Collect" },
  { id: "data-usage", title: "3. How We Use Data" },
  { id: "cookies-tracking", title: "4. Cookies & Tracking" },
  { id: "data-protection", title: "5. Data Protection" },
  { id: "your-rights", title: "6. Your Legal Rights" },
  { id: "contact", title: "7. Contact Information" },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Privacy Policy", url: `${SITE_URL}/privacy-policy` },
        ]),
        webPageSchema({
          name: "Privacy Policy",
          description: "UC Enterprises privacy policy on data collection and usage.",
          url: `${SITE_URL}/privacy-policy`,
          type: "WebPage",
        }),
      ]} />

      <PolicyLayout
        title="Privacy Policy"
        subtitle="Privacy Clause and Information Practices"
        lastUpdated="May 16, 2026"
        sections={SECTIONS}
      >
        <section id="introduction" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            1. Introduction
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            Welcome to UC Enterprises. We value your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, store, and protect your information when you visit our storefront or make purchases.
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            Our data practices are designed to align with the Digital Personal Data Protection (DPDP) Act 2023 of India, ensuring your data rights are respected.
          </p>
        </section>

        <section id="data-collection" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            2. Data We Collect
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            We collect information that helps us provide a reliable shopping experience. This includes:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-650 font-semibold mb-4">
            <li><strong>Identity & Profile Data:</strong> Name, business email address, phone number, and account login details.</li>
            <li><strong>Transactional & Shipping Data:</strong> Shipping address, billing address, and payment transaction references. We do not store credit card/banking details directly on our servers; payments are processed securely by Razorpay.</li>
            <li><strong>Technical & Usage Data:</strong> IP addresses, browser types, screen resolutions, and browsing patterns collected via session cookies.</li>
          </ul>
        </section>

        <section id="data-usage" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            3. How We Use Data
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            Your personal information is used exclusively for business operations and storefront improvements:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-650 font-semibold">
            <li>Fulfilling and delivering product orders, handling invoices, and generating tax/GST invoices.</li>
            <li>Managing user accounts and verifying security tokens for customer and admin portals.</li>
            <li>Providing order tracking updates and responding to support queries.</li>
            <li>Conducting anonymized analytics to speed up page load times and improve catalog layout.</li>
          </ul>
        </section>

        <section id="cookies-tracking" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            4. Cookies & Tracking
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            We use secure cookies to enable core features like user sessions and shopping cart persistence. 
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            You can fully customize your cookie consent options, including analytics and marketing cookies, via our <a href="/cookie-policy" className="text-primary font-bold hover:underline">Cookie Policy Page</a>.
          </p>
        </section>

        <section id="data-protection" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            5. Data Protection
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            We employ robust security measures to safeguard your personal data:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-650 font-semibold mb-4">
            <li><strong>HTTP-Only Cookies:</strong> Session tokens are stored in secure HTTP-only cookies, protecting them from Cross-Site Scripting (XSS) attacks.</li>
            <li><strong>Encrypted Connections:</strong> All data transmissions are encrypted using Transport Layer Security (TLS/HTTPS).</li>
            <li><strong>Direct Sourcing:</strong> Sourcing and user profiling databases are stored in isolated, secure cloud environments with strictly controlled access permissions.</li>
          </ul>
        </section>

        <section id="your-rights" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            6. Your Legal Rights
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            Under the DPDP Act, you have the following rights regarding your data:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-650 font-semibold">
            <li><strong>Right to Correction:</strong> Request updates to inaccurate details on your profile.</li>
            <li><strong>Right to Erasure:</strong> Ask us to delete your personal profile data if you decide to close your business account (excluding transactional records required for tax filings).</li>
            <li><strong>Right of Withdrawal:</strong> Revoke consent for optional cookies or promotional emails at any time.</li>
          </ul>
        </section>

        <section id="contact">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            7. Contact Information
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data rights, please contact our support team:
          </p>
          <p className="text-xs sm:text-sm text-zinc-800 font-bold">
            Email: sales@uc-enterprises.in<br />
            Address: Zirakpur, Punjab, India
          </p>
        </section>
      </PolicyLayout>
    </>
  );
}
