import type { Metadata } from "next";
import Link from "next/link";
import { companyTagline, companyCoreValues } from "@/lib/storefront";
import {
  CheckCircle2,
  ShieldCheck,
  Beaker,
  Wrench,
  Factory,
  GraduationCap,
  HeartPulse,
  Sparkles,
  TrendingUp,
  Award,
  Truck,
  Headphones,
  ArrowRight,
  Building2,
  Users2
} from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, localBusinessSchema, webPageSchema, breadcrumbSchema } from "@/lib/jsonld";
import { staticPageMetadata, SITE_URL } from "@/lib/seo";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = staticPageMetadata.about;

const coreValuesList = [
  {
    title: "Uncompromising Authenticity",
    desc: "Every reagent, tool, and equipment line passes direct manufacturer validation protocols.",
    icon: ShieldCheck,
  },
  {
    title: "Supply Chain Agility",
    desc: "Optimized operational pipelines designed to combat material shortages and eliminate lead time delays.",
    icon: TrendingUp,
  },
  {
    title: "Wide Accessibility",
    desc: "Excellent pricing and availability tailored for customers of all sizes.",
    icon: Factory,
  },
];

const serviceSectors = [
  { name: "Laboratories", icon: Beaker, desc: "Specialty chemicals, glassware & analytical instruments." },
  { name: "Industries", icon: Factory, desc: "Chemical processing plants & bulk raw item formulations." },
  { name: "Education", icon: GraduationCap, desc: "K-12 systems, technical institutes & research university supplies." },
  { name: "Healthcare", icon: HeartPulse, desc: "Hospitals, medical centers & diagnostic clinical assets." },
  { name: "Manufacturing", icon: Wrench, desc: "Heavy mechanical tools, production hardware & safety gear." },
];

const trustIndicators = [
  { title: "Direct Sourcing Channels", desc: "Eliminating middleman overhead to protect product integrity and secure bulk cost advantages.", icon: Building2 },
  { title: "Compliant & Certified", desc: "Rigorous adherence to international safety, handling, and logistics regulatory standards.", icon: Award },
  { title: "Express Logistics Network", desc: "Insured, climate-conscious transport setups designed to deliver high-priority freight cleanly.", icon: Truck },
  { title: "Dedicated Engineering Support", desc: "Post-delivery calibration assistance and technical support standing by 24/7.", icon: Headphones },
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

export default async function AboutPage() {
  const supabase = await createClient();

  const [
    { count: productsCount },
    { count: enterprisesCount }
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["customer", "enterprise"])
  ]);

  const yearsOfExcellence = new Date().getFullYear() - 2018;

  const formatCount = (count: number | null, fallback: string) => {
    if (count === null || count === 0) return fallback;
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
    if (count >= 100) return `${Math.floor(count / 100) * 100}+`;
    if (count >= 10) return `${Math.floor(count / 10) * 10}+`;
    return `${count}`;
  };

  const displayProducts = formatCount(productsCount, "15K+");
  const displayEnterprises = formatCount(enterprisesCount, "2,500+");

  const statistics = [
    { value: `${yearsOfExcellence}+`, label: "Years of Excellence", desc: "Empowering businesses since 2018." },
    { value: displayProducts, label: "Products Cataloged", desc: "Vetted industrial & lab assets." },
    { value: displayEnterprises, label: "Enterprises Served", desc: "Trusted by plants, labs & universities." },
    { value: "28+", label: "States Covered", desc: "Flawless pan-India supply logistics." },
  ];

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
      <section className="bg-gradient-to-b from-blue-50/50 to-white text-zinc-950 py-28 md:py-36 relative overflow-hidden text-left">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e750_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e750_1px,transparent_1px)] bg-[size:32px_32px] opacity-70"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl relative z-10">
          <div className="max-w-4xl space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-primary border border-zinc-200 shadow-sm text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Founded & Proven Since 2018
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] text-zinc-950 uppercase">
              {companyTagline}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-zinc-600 font-medium max-w-3xl leading-relaxed">
              UC Enterprises is a premier procurement ecosystem. We deliver high-integrity laboratory chemicals, precision industrial tools, and safety environments to customers nationwide with excellent pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Performance Metrics / Statistics Section */}
      <section className="relative z-20 -mt-12 w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl">
        <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-8 md:p-10 shadow-xl grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {statistics.map((stat, i) => (
            <div key={i} className="text-left space-y-1 pt-6 first:pt-0 sm:pt-0 lg:px-6 first:lg:pl-0">
              <p className="text-4xl font-black tracking-tight text-zinc-950">{stat.value}</p>
              <p className="text-xs font-bold text-zinc-900 tracking-wide uppercase">{stat.label}</p>
              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{stat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand DNA: Vision, Mission & Values */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-24">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* Left Column: Mission Anchor */}
          <div className="lg:col-span-5 space-y-6 text-left lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> Brand Mandate
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight leading-tight">
              {companyCoreValues}
            </h2>
            <p className="text-zinc-600 leading-relaxed text-sm font-medium">
              We operate under a simple philosophy: our customers cannot afford defective products. We bridge the gap between global manufacturers and your daily operational needs.
            </p>

            <div className="pt-6 space-y-3.5">
              {[
                "100% Verified products",
                "Strict temperature-controlled delivery capabilities",
                "Seamless ordering experience",
                "End-to-end visibility"
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-zinc-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Core Values Cards Layout */}
          <div className="lg:col-span-7 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 text-left pl-2">Operational Foundation</p>
            {coreValuesList.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white border border-zinc-200/60 p-6 rounded-3xl text-left flex items-start gap-5 transition-all hover:border-zinc-300">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-800 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-zinc-950 text-base">{item.title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Sectors We Empower */}
      <section className="bg-zinc-100/60 py-24 text-left">
        <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl">
          <div className="max-w-3xl mb-12 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Who We Serve</span>
            <h2 className="text-3xl font-black text-zinc-950 uppercase tracking-tight">Ecosystem Capabilities</h2>
            <p className="text-xs text-zinc-500 font-medium max-w-xl">Whether fitting a medical laboratory or supplying essential tools, our catalogs cover demanding operating profiles.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceSectors.map((sector, i) => {
              const Icon = sector.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-zinc-200/50 p-6 rounded-3xl transition-all hover:border-primary/30 hover:shadow-sm group flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-700 shrink-0 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all mb-6">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-900 text-sm uppercase tracking-wide">{sector.name}</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">{sector.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sourcing and Quality Commitments (Why Choose Us) */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-24">
        <div className="max-w-3xl text-left mb-16 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Strategic Safeguards</span>
          <h2 className="text-3xl font-black text-zinc-950 uppercase tracking-tight">Engineered for Reliability</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustIndicators.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="space-y-4 text-left border-l border-zinc-200 pl-5">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-950 tracking-tight">{item.title}</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Corporate Journey & Leadership Context */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-24">
        <div className="grid md:grid-cols-12 gap-12 items-center">

          <div className="md:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200 text-zinc-800 border border-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Our Story
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight leading-tight">
              The Genesis of UC Enterprises
            </h2>
            <p className="text-zinc-600 leading-relaxed text-sm font-medium">
              Established in 2018 within the industrial region of Ropar, Punjab, UC Enterprises emerged out of an acute reality: customers and scientific operations were constantly stymied by fragmented delivery mechanics and counterfeit products.
            </p>
            <p className="text-zinc-600 leading-relaxed text-sm font-medium">
              What launched as a micro-regional supply channel for verified lab compounds evolved systematically into a reliable national hub. Today, we consolidate hundreds of top-tier global chemical, safety, and component brands under a streamlined digital interface—passing down great pricing and reliable service directly to you.
            </p>
          </div>

          <div className="md:col-span-5">
            <div className="bg-gradient-to-br from-primary/5 to-white border border-primary/10 text-zinc-900 rounded-[2rem] p-8 md:p-10 text-left relative overflow-hidden group shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Leadership</span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-zinc-950 mb-1">Uc enterprises</h3>
              <p className="text-xs text-zinc-500 font-semibold mb-6">Founder & Managing Director</p>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium italic">
                &ldquo;Under our operational stewardship, UC Enterprises has elevated transparency and product safety. We exist simply to power scientific discovery, learning, and manufacturing across India without standard logistical failure vectors.&rdquo;
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Sourcing Brands Panel */}
      <section className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-24 bg-zinc-50/50">
        <div className="max-w-3xl text-left mb-12 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Global Brand Portfolios</span>
          <h2 className="text-3xl font-black text-zinc-950 uppercase tracking-tight">Authorized Sourcing Partners</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {brandCategories.map((category, idx) => (
            <div
              key={idx}
              className="bg-white border border-zinc-200/60 rounded-[2rem] p-6 sm:p-8 text-left flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-black text-zinc-950 mb-5 flex items-center gap-3 uppercase tracking-wider">
                  <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                  {category.title}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {category.brands.map((brand, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-zinc-50 text-zinc-700 text-xs font-bold rounded-xl border border-zinc-150 hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-default select-none"
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