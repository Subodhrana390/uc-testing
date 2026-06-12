import type { Metadata } from "next";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/jsonld";
import PolicyLayout from "@/components/storefront/PolicyLayout";

export const metadata: Metadata = staticPageMetadata.termsOfService;

const SECTIONS = [
  { id: "terms-acceptance", title: "1. Terms of Acceptance" },
  { id: "ordering-contracts", title: "2. Ordering & Contracts" },
  { id: "pricing-taxes", title: "3. Pricing & Taxes" },
  { id: "shipping-logistics", title: "4. Shipping & Logistics" },
  { id: "cancellation-refunds", title: "5. Cancellation & Refunds" },
  { id: "liability-limits", title: "6. Liability Limits" },
  { id: "governing-law", title: "7. Dispute & Governing Law" },
];

export default function TermsOfServicePage() {
  return (
    <>
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

      <PolicyLayout
        title="Terms of Service"
        subtitle="eCommerce Terms, Delivery, & Business Contracting"
        lastUpdated="May 16, 2026"
        sections={SECTIONS}
      >
        <section id="terms-acceptance" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            1. Terms of Acceptance
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            By accessing or using the UC Enterprises website (referred to as the "Service" or "Platform"), you agree to comply with and be bound by these Terms of Service. These terms govern all purchases, shipping logistics, and customer accounts.
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            If you represent a corporate entity, hospital, laboratory, or educational institution, you warrant that you have authority to bind the entity to these Terms.
          </p>
        </section>

        <section id="ordering-contracts" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            2. Ordering & Contracts
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            All orders placed through our Platform represent an offer to purchase. A commercial contract is only formed when UC Enterprises dispatches the products and issues a final tax invoice.
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            We reserve the right to decline or cancel orders due to stock unavailability, pricing discrepancies, shipping location restrictions, or pending payment failures.
          </p>
        </section>

        <section id="pricing-taxes" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            3. Pricing & Taxes
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            Product prices display on the storefront. If a product goes on sale, the `sale_price` overrides the base price. 
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-650 font-semibold">
            <li><strong>GST & Taxes:</strong> Unless indicated otherwise, commercial invoices include applicable Goods and Services Tax (GST) under Indian tax laws.</li>
            <li><strong>Bulk Pricing:</strong> Corporate and institutional quotes may qualify for volume discounts, which are negotiated via direct support invoice generation.</li>
          </ul>
        </section>

        <section id="shipping-logistics" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            4. Shipping & Logistics
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            We deliver products across 28+ states in India. Shipping charges are calculated at checkout based on total weight and delivery location.
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            Dispatch timelines are estimates. We coordinate with reputable national logistics carriers to ensure safe transport. Delivery tracking is made available in your account orders dashboard.
          </p>
        </section>

        <section id="cancellation-refunds" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            5. Cancellation & Refunds
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            Our cancellation and refund policies protect both parties:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-650 font-semibold">
            <li><strong>Auto-Cancellation:</strong> Orders remain in pending status if payment fails. Unpaid pending orders are automatically cancelled to maintain inventory accuracy.</li>
            <li><strong>Refunds:</strong> Refund requests for cash-paid orders take 2 to 3 business days to process and return directly to the customer's registered bank account. Online refunds are credited via the original payment gateway.</li>
          </ul>
        </section>

        <section id="liability-limits" className="mb-10">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            6. Liability Limits
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            To the maximum extent permitted by law, UC Enterprises shall not be liable for any indirect, incidental, or consequential damages resulting from product handling, chemical usage, or delivery delays.
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            Warranty claims are restricted to manufacturer warranty terms. Our total liability for any order shall not exceed the invoice price paid for that specific order.
          </p>
        </section>

        <section id="governing-law">
          <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4 border-b border-zinc-100 pb-2">
            7. Dispute & Governing Law
          </h2>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium mb-4">
            These Terms of Service and any transactional disputes are governed by and construed in accordance with the laws of India.
          </p>
          <p className="text-xs sm:text-sm text-zinc-650 leading-relaxed font-medium">
            All legal claims, litigation, or arbitration arising from transactions on this Platform shall be subject to the exclusive jurisdiction of the courts located in SAS Nagar (Mohali) / Zirakpur, Punjab.
          </p>
        </section>
      </PolicyLayout>
    </>
  );
}
