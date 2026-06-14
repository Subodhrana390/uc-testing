import type { Metadata } from "next";
import { companyTagline, companyCoreValues } from "@/lib/storefront";
import { CheckCircle2, ShieldCheck, Beaker, Wrench, Factory, GraduationCap, HeartPulse, Sparkles } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, localBusinessSchema, webPageSchema, breadcrumbSchema } from "@/lib/jsonld";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = staticPageMetadata.about;

const serviceSectors = [
  { name: "Laboratories", icon: Beaker, desc: "Specialty chemicals, glassware & instruments." },
  { name: "Industries", icon: Factory, desc: "Chemical processing & wholesale raw items." },
  { name: "Education", icon: GraduationCap, desc: "K-12 & research university supplies." },
  { name: "Healthcare", icon: HeartPulse, desc: "Hospitals & diagnostics clinical items." },
  { name: "Manufacturing", icon: Wrench, desc: "Heavy tools, hardware & safety gear." },
];

const brandCategories = [
  {
    title: "Chemicals & Plasticware",
    brands: ["Merck", "LOBA Chemie", "Qualikems", "CDH", "Rankem", "Thomas Scientific", "Borosil", "Tarsons", "HiMedia", "S.D. Fine-Chem", "Nice"]
  },
  {
    title: "Tools & Hardware",
    brands: ["Stanley", "DeWalt", "Bosch", "Ingco", "Makita", "Irwin", "Yato", "Knipex", "Mitutoyo", "Fluke", "Bahco", "Ridgid", "Taparia"]
  },
  {
    title: "Instruments & Equipment",
    brands: ["Mettler Toledo", "Thermo Scientific", "Eppendorf", "IKA", "Hanna Instruments", "Shimadzu", "Agilent", "Sartorius", "Heidolph"]
  },
  {
    title: "Safety & PPE Partners",
    brands: ["3M", "Ansell", "Honeywell", "DuPont", "Uvex", "Lakeland", "MSA", "Dräger", "Karam", "Prosafe", "Venus"]
  }
];

export default function AboutPage() {
  return (
    <div className="bg-zinc-50/40 min-h-screen text-zinc-900 antialiased">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "About Us", url: `${SITE_URL}/about` },
        ]),
        webPageSchema({
          name: "About UC Enterprises — India's Trusted Lab & Industrial Supplier",
          description: "Learn about UC Enterprises, established 2018, serving labs, industries and institutions across India.",
          url: `${SITE_URL}/about`,
          type: "AboutPage",
        }),
        organizationSchema(),
        localBusinessSchema(),
      ]} />

      {/* Hero Section */}
      <section className="bg-zinc-950 text-white py-28 relative overflow-hidden text-left border-b border-zinc-900">
        {/* Subtle mesh grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3f3f4625_1px,transparent_1px),linear-gradient(to_bottom,#3f3f4625_1px,transparent_1px)] bg-[size:32px_32px] opacity-70"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

        <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl relative z-10">
          <div className="max-w-4xl space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Established 2018
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] text-white uppercase">
              {companyTagline}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-zinc-400 font-semibold max-w-3xl leading-relaxed">
              We supply specialized laboratory chemicals, glassware, industrial tools, instruments, and corporate safety equipment to enterprises across India with business-friendly pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Core Promise & Service Sectors */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-20">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6 text-left lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 text-primary border border-orange-100 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> Our Commitment
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight leading-tight">
              {companyCoreValues}
            </h2>
            <p className="text-zinc-650 leading-relaxed text-sm font-medium">
              UC Enterprises coordinates with globally recognized chemical and industrial brands to streamline supply chains for laboratories, universities, manufacturing units, and healthcare facilities.
            </p>
            
            <div className="pt-4 border-t border-zinc-200/60 space-y-3">
              {[
                "100% Genuine and authenticated products",
                "Direct manufacturer sourcing channels",
                "Pan-India prompt business logistics",
                "Dedicated post-sale technical support"
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-zinc-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Cards Column */}
          <div className="lg:col-span-7">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 text-left pl-2">Sectors We Empower</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {serviceSectors.map((sector, i) => {
                const Icon = sector.icon;
                return (
                  <div 
                    key={i} 
                    className="bg-white border border-zinc-200/60 p-6 rounded-3xl text-left transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 group flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-700 shrink-0 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-zinc-900 text-sm">{sector.name}</p>
                      <p className="text-[11px] text-zinc-550 leading-relaxed font-semibold">{sector.desc}</p>
                    </div>
                  </div>
                );
              })}
              
              {/* Stats card */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-left text-white flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Logistics Coverage</span>
                <div className="mt-4 space-y-1">
                  <p className="text-3xl font-black">28+ States</p>
                  <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed">Delivering critical business assets to enterprises and laboratories nationwide.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Our Story & Leadership Section */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-20 border-t border-zinc-200/80">
        <div className="grid md:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Background */}
          <div className="md:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200 text-zinc-800 border border-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Our Background
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight leading-tight">
              How We Built UC Enterprises
            </h2>
            <p className="text-zinc-600 leading-relaxed text-sm font-medium">
              Founded in 2018 in Ropar, Punjab, UC Enterprises began with a singular mission: to streamline the supply chain of high-grade laboratory chemicals, precision glassware, and robust safety equipment. 
            </p>
            <p className="text-zinc-600 leading-relaxed text-sm font-medium">
              Over the years, we have grown from a regional distributor to a trusted pan-India partner. We coordinate directly with global laboratory and industrial manufacturers to serve manufacturing plants, educational institutions, diagnostic laboratories, and healthcare facilities with business-friendly wholesale pricing.
            </p>
          </div>

          {/* Right Column: Owner Profile Card */}
          <div className="md:col-span-5">
            <div className="bg-zinc-950 text-white rounded-[2rem] p-8 md:p-10 text-left relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Leadership</span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Subodh Rana</h3>
              <p className="text-xs text-zinc-400 font-semibold mb-6">Founder & Owner</p>
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                "Under our leadership, UC Enterprises has prioritized customer trust and direct manufacturer relationships above all. We are driven by the vision of empowering Indian scientific research, education, and manufacturing sectors with seamless access to authentic, high-quality tools and reagents."
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Trusted Brands Panel */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-20 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-3xl text-left mb-12 space-y-2">
          <h2 className="text-3xl font-black text-zinc-950 uppercase tracking-tight">Authorized Sourcing Partners</h2>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">Global Brand Network</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {brandCategories.map((category, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-zinc-200/60 rounded-[2rem] p-6 sm:p-8 shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-black text-zinc-950 mb-5 flex items-center gap-3 uppercase">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                  {category.title}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {category.brands.map((brand, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1.5 bg-zinc-50 text-zinc-650 text-xs font-bold rounded-xl border border-zinc-150 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-colors cursor-default select-none"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
