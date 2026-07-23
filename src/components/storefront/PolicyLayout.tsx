"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, FileText, Cookie, ChevronRight, List } from "lucide-react";

interface Section {
  id: string;
  title: string;
}

interface PolicyLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: Section[];
}

const POLICY_PAGES = [
  { name: "Privacy Policy", href: "/privacy-policy", icon: Shield },
  { name: "Terms of Service", href: "/terms-of-service", icon: FileText },
  { name: "Cookie Policy", href: "/cookie-policy", icon: Cookie },
];

export default function PolicyLayout({
  children,
  title,
  subtitle,
  lastUpdated,
  sections,
}: PolicyLayoutProps) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("");

  // Set up intersection observer to highlight active section in TOC on scroll
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-10% 0px -75% 0px", // triggers when heading is in top 10-25% of viewport
      threshold: 0,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((sec) => {
        const el = document.getElementById(sec.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Offset for sticky header
      const offset = 90;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="bg-zinc-50/50 min-h-screen text-zinc-900 antialiased pb-20">
      {/* Breadcrumbs Banner */}
      <div className="w-full bg-white border-b border-zinc-200/80">
        <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl py-5">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <li>
                <Link prefetch={false} href="/" className="hover:text-zinc-700 transition">
                  Home
                </Link>
              </li>
              <li>
                <ChevronRight className="h-3 w-3 text-zinc-300" />
              </li>
              <li>
                <span className="text-zinc-700 font-bold">{title}</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Hero Header */}
      <header className="bg-white border-b border-zinc-150 py-12 md:py-16 text-left">
        <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl">
          <div className="max-w-3xl space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Corporate Policies</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-950 uppercase">{title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400 pt-1">
              <span>{subtitle}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200"></span>
              <span>Last Updated: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto max-w-7xl mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
            
            {/* Page switching tabs */}
            <div className="bg-white border border-zinc-200/80 p-4 rounded-3xl shadow-2xs space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-3 mb-2">Legal Documents</p>
              {POLICY_PAGES.map((page) => {
                const PageIcon = page.icon;
                const isActive = pathname === page.href;
                return (
                  <Link prefetch={false}
                    key={page.href}
                    href={page.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                      isActive
                        ? "bg-zinc-950 text-white shadow-sm font-black"
                        : "text-zinc-650 hover:bg-zinc-50 hover:text-zinc-950"
                    )}
                  >
                    <PageIcon className="w-4 h-4 shrink-0" />
                    <span>{page.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Table of contents (Only on desktop) */}
            {sections.length > 0 && (
              <div className="hidden lg:block bg-white border border-zinc-200/80 p-5 rounded-3xl shadow-2xs space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <List className="w-3.5 h-3.5" /> On This Page
                </h3>
                <div className="space-y-1 pr-1 max-h-[300px] overflow-y-auto custom-scrollbar text-left border-l border-zinc-100 ml-1 pl-3">
                  {sections.map((sec) => {
                    const isSecActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => scrollToSection(sec.id)}
                        className={cn(
                          "block w-full text-left text-xs py-1.5 transition-all outline-hidden border-l-2 -ml-[13px] pl-3",
                          isSecActive
                            ? "border-primary text-zinc-950 font-bold"
                            : "border-transparent text-zinc-450 hover:text-zinc-800"
                        )}
                      >
                        {sec.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* Policy Text Content */}
          <main className="lg:col-span-3 bg-white border border-zinc-200/80 rounded-[2rem] p-6 sm:p-10 shadow-sm text-left">
            
            {/* Mobile TOC Quick Navigation Dropdown */}
            {sections.length > 0 && (
              <details className="lg:hidden mb-8 border border-zinc-200 bg-zinc-50/50 rounded-2xl p-4 cursor-pointer select-none">
                <summary className="text-xs font-bold text-zinc-800 flex items-center gap-2 uppercase tracking-wider">
                  <List className="w-4 h-4 text-zinc-500" />
                  <span>On This Page: Jump to Section</span>
                </summary>
                <div className="mt-3 pl-6 space-y-2 border-l border-zinc-200">
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className="block text-left text-xs font-semibold text-zinc-650 hover:text-primary transition py-1"
                    >
                      {sec.title}
                    </button>
                  ))}
                </div>
              </details>
            )}

            <div className="prose prose-zinc max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-zinc-900 prose-headings:uppercase prose-p:text-zinc-650 prose-p:leading-relaxed prose-li:text-zinc-650 prose-strong:text-zinc-900 prose-headings:scroll-mt-24">
              {children}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
