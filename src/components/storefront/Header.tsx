"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Heart,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import {
  supportPhone,
  supportPhoneHref,
  supportEmailHref,
  primaryNavLinks,
} from "@/lib/storefront";
import CartButton from "@/components/storefront/CartButton";
import WishlistButton from "@/components/storefront/WishlistButton";
import HeaderSearch from "@/components/storefront/HeaderSearch";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  categories: {
    id: string;
    name: string;
    slug: string;
    parent_id?: string | null;
  }[];
  user: any;
}

export default function Header({ categories, user }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Build login URL with current page as returnTo at click-time (avoids useSearchParams Suspense requirement)
  const goToLogin = () => {
    const returnTo = typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/";
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <div className="sticky top-0 z-50 w-full">
        {/* Top Bar */}
        <div className="bg-zinc-950 text-zinc-400 overflow-hidden">
          <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-6">
              <a
                href={supportPhoneHref}
                className="inline-flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="h-3 w-3 text-primary" />
                {supportPhone}
              </a>
              <a
                href={supportEmailHref}
                className="hidden xs:inline-flex items-center gap-2 hover:text-white transition-colors"
              >
                <Mail className="h-3 w-3 text-primary" />
                Sales Support
              </a>
            </div>
            <div className="hidden md:inline-flex items-center gap-2 text-zinc-500">
              <MapPin className="h-3 w-3 text-primary" />
              Zirakpur, Punjab
            </div>
          </div>
        </div>

        <header className="border-b border-zinc-100 bg-white/95 backdrop-blur-md shadow-sm">
          <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto">
            <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-8 relative">
              <div className="flex items-center gap-1 sm:gap-4 shrink-0 min-w-0">
                {/* Mobile Menu Button */}
                <button
                  className="lg:hidden -ml-2 p-2 shrink-0 text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Logo */}
                <Link
                  href="/"
                  className="shrink flex items-center gap-2 sm:gap-3 group min-w-0 pr-4"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 overflow-hidden flex items-center justify-center p-1 transition group-hover:border-primary group-hover:scale-105">
                    <Image
                      src="/logo.png"
                      alt="UC Enterprises"
                      width={40}
                      height={40}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 leading-none truncate">
                      UC <span className="text-primary">ENTERPRISES</span>
                    </span>
                    <span className="text-[9px] sm:text-xs font-bold tracking-wider text-zinc-700 mt-0.5 truncate hidden sm:block">
                      Quality Industrial Supplies
                    </span>
                  </div>
                </Link>
              </div>

              {/* Desktop Search */}
              <div className="hidden lg:block flex-1 w-full max-w-4xl px-4 xl:px-12">
                <HeaderSearch />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 sm:gap-4 shrink-0">
                {!user ? (
                  <button
                    onClick={goToLogin}
                    className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </button>
                ) : (
                  <Link
                    href="/account/profile"
                    className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Account</span>
                  </Link>
                )}

                {user && (
                  <button
                    onClick={handleLogout}
                    className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-red-600 transition-colors border-l border-zinc-100 pl-4"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}

                <WishlistButton />

                {/* Mobile Profile Icon */}
                {!user ? (
                  <button
                    onClick={goToLogin}
                    className="sm:hidden p-2 text-zinc-700 hover:text-primary"
                  >
                    <User className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    href="/account/profile"
                    className="sm:hidden p-2 text-zinc-700 hover:text-primary"
                  >
                    <User className="h-4 w-4" />
                  </Link>
                )}

                <div className="flex items-center">
                  <CartButton />
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 py-3 border-t border-zinc-50 text-sm font-semibold text-zinc-700">
              <div className="group relative">
                <button className="inline-flex items-center gap-2 text-primary hover:text-red-700 transition-colors">
                  Categories
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                <div className="invisible absolute left-0 top-full z-50 mt-2 w-[550px] border border-zinc-100 bg-white opacity-0 shadow-2xl rounded-none overflow-hidden transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-y-1 flex">
                  {/* Main Categories (Left Sidebar) */}
                  <div className="w-1/3 bg-zinc-50 border-r border-zinc-100 p-2 max-h-[450px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1 mt-1">
                      {categories
                        .filter((c) => !c.parent_id)
                        .map((mainCat) => (
                          <div key={mainCat.id} className="group/main">
                            <Link
                              href={`/search?main=${mainCat.slug}`}
                              className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold rounded-xl hover:bg-white hover:text-primary transition-all text-zinc-700"
                            >
                              {mainCat.name}
                              <ChevronDown className="h-4 w-4 -rotate-90 opacity-40 group-hover/main:opacity-100" />
                            </Link>

                            {/* Subcategories (Right Panel) */}
                            <div className="invisible absolute left-[33.33%] top-0 w-[66.66%] h-full p-5 bg-white border-l border-zinc-100 opacity-0 transition-all group-hover/main:visible group-hover/main:opacity-100 z-10 overflow-y-auto custom-scrollbar">
                              <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-black tracking-tight text-zinc-950 uppercase">
                                  {mainCat.name}
                                </h3>
                                <Link
                                  href={`/search?main=${mainCat.slug}`}
                                  className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                                >
                                  View All
                                </Link>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                {categories
                                  .filter((sub) => sub.parent_id === mainCat.id)
                                  .map((subCat) => (
                                    <Link
                                      key={subCat.id}
                                      href={`/search?main=${mainCat.slug}&sub=${subCat.slug}`}
                                      className="text-sm font-bold text-zinc-600 hover:text-primary transition-colors py-1"
                                    >
                                      {subCat.name}
                                    </Link>
                                  ))}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Default Panel (Right) */}
                  <div className="flex-1 p-6 flex flex-col justify-center text-center bg-white">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Image
                        src="/logo.png"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain opacity-50"
                      />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-950 mb-1">
                      Explore Catalog
                    </h4>
                    <p className="text-[9px] text-zinc-500 max-w-[180px] mx-auto leading-relaxed font-bold uppercase tracking-wider opacity-60">
                      Hover to browse specialized industrial segments.
                    </p>
                  </div>
                </div>
              </div>

              {primaryNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Search */}
            <div className="lg:hidden pb-3">
              <HeaderSearch />
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[101] flex flex-col shadow-2xl"
            >
              <div className="p-5 flex items-center justify-between border-b">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-black text-lg tracking-tight"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="w-7 h-7 flex items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="Logo"
                      width={28}
                      height={28}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  UC <span className="text-primary text-sm">ENTERPRISES</span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-zinc-50 text-zinc-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6">
                <div className="px-5 space-y-8">
                  {/* Account Links */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Login / Profile */}
                    {!user ? (
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); goToLogin(); }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200 transition-colors font-semibold text-sm"
                      >
                        <User className="h-4 w-4" />
                        <span>Login</span>
                      </button>
                    ) : (
                      <Link
                        href="/account/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200 transition-colors font-semibold text-sm"
                      >
                        <User className="h-4 w-4 text-primary" />
                        <span>Profile</span>
                      </Link>
                    )}

                    {/* Wishlist */}
                    <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200 transition-colors font-semibold text-sm">
                      <WishlistButton />
                      <span>Saved</span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4 px-2">
                      Menu
                    </p>
                    {primaryNavLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center px-4 py-3 rounded-xl text-zinc-700 hover:bg-zinc-50 hover:text-primary transition-all font-semibold text-sm"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  {/* Categories */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4 px-2">
                      Shop By Category
                    </p>
                    <div className="space-y-2">
                      {categories
                        .filter((c) => !c.parent_id)
                        .map((mainCat) => (
                          <div key={mainCat.id} className="space-y-1">
                            <Link
                              href={`/search?main=${mainCat.slug}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-zinc-900 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                            >
                              {mainCat.name}
                            </Link>
                            <div className="grid grid-cols-1 gap-1 pl-4">
                              {categories
                                .filter((sub) => sub.parent_id === mainCat.id)
                                .map((subCat) => (
                                  <Link
                                    key={subCat.id}
                                    href={`/search?main=${mainCat.slug}&sub=${subCat.slug}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-primary hover:bg-orange-50 transition-colors"
                                  >
                                    {subCat.name}
                                  </Link>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t bg-zinc-50 space-y-4">
                {user && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-red-100 text-red-600 hover:bg-red-50 transition-colors font-semibold text-sm shadow-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                )}
                <div className="flex flex-col gap-1 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">
                  <span>Support: {supportPhone}</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
