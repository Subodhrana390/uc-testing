import { companyTagline, companyCoreValues } from "@/lib/storefront";
import { CheckCircle2, ShieldCheck, Beaker, Wrench, Factory, GraduationCap, HeartPulse } from "lucide-react";
import Image from "next/image";

const serviceSectors = [
  { name: "Laboratories", icon: Beaker },
  { name: "Industries", icon: Factory },
  { name: "Educational Institutions", icon: GraduationCap },
  { name: "Hospitals", icon: HeartPulse },
  { name: "Manufacturing Units", icon: Wrench },
];

const brandCategories = [
  {
    title: "Chemicals, Plasticware & Glassware",
    brands: ["Merck", "LOBA Chemie", "Qualikems", "CDH", "Rankem", "Thomas Scientific", "Borosil", "Tarsons", "HiMedia", "S.D. Fine-Chem", "Vijay", "J-Sil", "Desco", "Riviera", "Silicon", "Labtech", "Nice", "Glassco", "Simax", "Duran Wheaton Kimble"]
  },
  {
    title: "Tools & Hardware",
    brands: ["Stanley", "DeWalt", "Bosch", "Ingco", "Makita", "Irwin", "Yato", "Knipex", "Mitutoyo", "Fluke", "Bahco", "Ridgid", "Taparia", "Gedore", "Hilti", "Greenlee", "Festool", "Black+Decker", "Sata", "Proto"]
  },
  {
    title: "Instruments & Equipment",
    brands: ["Mettler Toledo", "Thermo Scientific", "Eppendorf", "IKA", "Hanna Instruments", "Shimadzu", "Agilent", "Labtron", "Hitachi", "Ohaus", "PerkinElmer", "Memmert", "Julabo", "Buchi", "Analytik Jena", "Horiba", "Elga Veolia", "Sartorius", "Integra", "Heidolph", "Velp Scientifica"]
  },
  {
    title: "Safety & PPE Partners",
    brands: ["3M", "Ansell", "Honeywell", "DuPont", "Uvex", "Lakeland", "MSA", "Dräger", "Karam", "Prosafe", "Mallcom", "Venus", "Koch", "Tynor", "BPL Medical", "Technico"]
  }
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-zinc-950 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-primary">About UC Enterprises</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">{companyTagline}</h1>
            <p className="text-xl text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Serving customers across India with dependable supply, business-friendly pricing, and practical product guidance.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values & Benefits */}
      <section className="container mx-auto px-4 py-20 border-b border-zinc-100">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-primary font-black uppercase tracking-widest text-xs">
              <ShieldCheck className="w-4 h-4" /> Core Promise
            </div>
            <h2 className="text-4xl font-black text-zinc-950">{companyCoreValues}</h2>
            <p className="text-zinc-600 leading-relaxed text-lg">
              We understand that the success of your laboratory, factory, or institution depends on the reliability of your supply chain. That's why we ensure every product we deliver meets the highest standards of quality.
            </p>
            <ul className="space-y-4 pt-4">
              {["100% genuine & quality assured", "Competitive wholesale prices", "Fast & reliable delivery across India", "Dedicated technical support"].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-zinc-800 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {serviceSectors.map((sector, i) => {
              const Icon = sector.icon;
              return (
                <div key={i} className="bg-zinc-50 border border-zinc-100 p-6 rounded-3xl text-center hover:border-primary hover:bg-orange-50 transition-colors">
                  <Icon className="w-8 h-8 text-primary mx-auto mb-4" />
                  <p className="font-bold text-zinc-900">{sector.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trusted Brands */}
      <section className="container mx-auto px-4 py-24 bg-zinc-50/50">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <h2 className="text-4xl font-black text-zinc-950">Our Trusted Partners</h2>
          <p className="text-lg text-zinc-600">We source directly from the world's most reputable manufacturers to guarantee authenticity and performance.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {brandCategories.map((category, idx) => (
            <div key={idx} className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all">
              <h3 className="text-xl font-black text-zinc-950 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">{idx + 1}</span>
                {category.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.brands.map((brand, i) => (
                  <span key={i} className="px-4 py-2 bg-zinc-50 text-zinc-600 text-sm font-bold rounded-xl border border-zinc-100 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-colors cursor-default">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
