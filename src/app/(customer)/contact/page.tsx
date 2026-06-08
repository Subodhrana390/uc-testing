import type { Metadata } from "next";
import { supportEmail, supportPhone, companyAddress, companyTagline } from "@/lib/storefront";
import { MapPin, Phone, Mail } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { localBusinessSchema, breadcrumbSchema, webPageSchema } from "@/lib/jsonld";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = staticPageMetadata.contact;

export default function ContactPage() {
  return (
    <div className="bg-white min-h-[calc(100vh-80px)]">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Contact", url: `${SITE_URL}/contact` },
        ]),
        webPageSchema({
          name: "Contact UC Enterprises — Sales, Support & Bulk Enquiries",
          description: "Contact UC Enterprises for sales enquiries, bulk orders or technical support.",
          url: `${SITE_URL}/contact`,
          type: "ContactPage",
        }),
        localBusinessSchema(),
      ]} />
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-4xl px-4 py-20">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-3">Contact Us</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-950 mb-6">Reach our sales and support desk</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 mb-12">
          {companyTagline} Contact us for your sourcing needs, bulk inquiries, or support requests.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="border border-orange-100 bg-orange-50 p-8 rounded-3xl transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary mb-6 shadow-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-zinc-950 mb-3">Headquarters</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">{companyAddress}</p>
          </div>

          <div className="border border-orange-100 bg-white p-8 rounded-3xl shadow-sm transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-primary mb-6">
              <Phone className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-zinc-950 mb-3">Phone</h2>
            <p className="text-sm font-bold text-zinc-600">{supportPhone}</p>
            <p className="text-xs text-zinc-400 mt-2">Mon-Sat from 9am to 6pm.</p>
          </div>

          <div className="border border-orange-100 bg-white p-8 rounded-3xl shadow-sm transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-primary mb-6">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-zinc-950 mb-3">Email</h2>
            <p className="text-sm font-bold text-primary break-all">{supportEmail}</p>
            <p className="text-xs text-zinc-400 mt-2">We typically reply within 2 hours.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
