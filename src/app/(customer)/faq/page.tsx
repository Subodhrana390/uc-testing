"use client";

import { useState, useMemo } from "react";
import { Search, X, HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { faqItems } from "@/lib/storefront";
import FAQAccordion from "@/components/storefront/FAQAccordion";
import { cn } from "@/lib/utils";
import JsonLd from "@/components/seo/JsonLd";
import { faqSchema, breadcrumbSchema, webPageSchema } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/seo";

const CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "Ordering", label: "Ordering" },
  { id: "Shipping", label: "Shipping & Delivery" },
  { id: "Quotes", label: "Bulk & Quotes" },
  { id: "Products", label: "Products & Quality" },
  { id: "Support", label: "Customer Support" },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredItems = useMemo(() => {
    return faqItems.filter((item) => {
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="bg-gradient-to-b from-white via-zinc-50/15 to-white min-h-screen relative overflow-hidden py-12">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "FAQ", url: `${SITE_URL}/faq` },
        ]),
        webPageSchema({
          name: "FAQ — Ordering, Shipping & Product Questions",
          description: "Answers to common questions about ordering laboratory supplies, shipping and product certifications at UC Enterprises.",
          url: `${SITE_URL}/faq`,
          type: "FAQPage",
        }),
        faqSchema(faqItems),
      ]} />
      {/* Decorative blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-red-500/[0.012] rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-center mx-auto text-zinc-500 shadow-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-sm font-medium text-zinc-500 leading-relaxed">
            Need help with your laboratory or industrial supply orders? Find quick answers regarding our processes, certification, and shipping below.
          </p>
        </div>

        {/* Search & Filter Section */}
        <div className="space-y-6 mb-10">
          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search questions, keywords, policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 h-12 bg-white border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-400 transition-all placeholder:text-zinc-400 text-zinc-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-0 sm:px-0 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-2.5 text-[10px] font-bold rounded-xl transition-all border whitespace-nowrap uppercase tracking-wider",
                    isActive
                      ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                      : "bg-white text-zinc-500 border-zinc-200/80 hover:text-zinc-800 hover:border-zinc-300"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accordions */}
        <div className="max-w-3xl mx-auto">
          {filteredItems.length > 0 ? (
            <FAQAccordion items={filteredItems} />
          ) : (
            <div className="text-center py-16 bg-white border border-zinc-200/60 rounded-3xl p-8 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200/65 flex items-center justify-center mx-auto text-zinc-400 mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 tracking-tight">No results found</h3>
              <p className="text-xs font-medium text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                We couldn't find any questions matching "{searchQuery}" in this category. Try adjusting your keywords.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-5 text-xs font-bold text-zinc-950 hover:text-zinc-700 uppercase tracking-wider"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Support CTA Section */}
        <div className="max-w-3xl mx-auto mt-16 p-6 sm:p-8 bg-zinc-950 border border-zinc-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none animate-pulse" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">Still have questions?</h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-medium mt-1">
                Our customer support and sales teams are here to assist with product documentation, delivery zones, or custom pricing.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-zinc-950 hover:bg-zinc-50 active:scale-95 transition-all text-xs font-bold px-5 py-3.5 rounded-xl shadow-sm uppercase tracking-wider w-full sm:w-auto text-center"
              >
                <MessageSquare className="w-4 h-4" /> Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
