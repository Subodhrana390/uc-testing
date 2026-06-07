import type { Metadata } from "next";
import { ShieldCheck, Lock, Eye, FileText, Database, UserCheck } from "lucide-react";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, webPageSchema } from "@/lib/jsonld";

export const metadata: Metadata = staticPageMetadata.privacyPolicy;


export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: "Data Collection",
      icon: <Eye className="w-5 h-5" />,
      content: "We collect personal information including your name, shipping address, email, and phone number to process orders. We also collect device information (IP address, browser type) to improve site performance and security."
    },
    {
      title: "Usage of Information",
      icon: <FileText className="w-5 h-5" />,
      content: "Information is primarily used for order fulfillment, invoice generation, and customer support. We may use your email for service updates or promotional offers (with your consent)."
    },
    {
      title: "Secure Authentication",
      icon: <Lock className="w-5 h-5" />,
      content: "We use secure, HTTP-only cookies for session management. This architecture prevents session hijacking and ensures your authentication tokens are never exposed to client-side scripts."
    },
    {
      title: "Data Retention",
      icon: <Database className="w-5 h-5" />,
      content: "We retain transaction records for a period required by Indian tax laws. Personal profile data is kept as long as your account is active."
    },
    {
      title: "Your Rights",
      icon: <UserCheck className="w-5 h-5" />,
      content: "You have the right to access, correct, or delete your personal data. You can manage these settings directly via your Profile Dashboard or by contacting our support team."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
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
      {/* Header Section */}
      <header className="bg-white border-b border-zinc-200">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <h1 className="text-5xl font-black tracking-tighter text-zinc-950 uppercase italic">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="mt-4 text-zinc-500 font-medium max-w-2xl leading-relaxed">
            Effective Date: May 16, 2026
          </p>
        </div>
      </header>

      {/* Content Section */}
      <div className="container mx-auto max-w-5xl px-6 -mt-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-primary mb-6">
                {section.icon}
              </div>
              <h3 className="text-lg font-black tracking-tight mb-3 uppercase">
                {section.title}
              </h3>
              <p className="text-sm leading-7 text-zinc-600 font-medium">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
      <footer className="container mx-auto max-w-5xl px-6 mt-8">
        <p className="text-zinc-400 text-xs font-medium max-w-md">
          Our practices align with the Digital Personal Data Protection Act (DPDP) 2023.
          We do not sell user data to third-party advertisers.
        </p>
      </footer>
    </div>
  );
}
