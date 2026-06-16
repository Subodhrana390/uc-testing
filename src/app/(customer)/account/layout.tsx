"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Heart,
  Package, Mail,
  LogOut,
  ChevronRight,
  Settings,
  Menu,
  X,
  FileText
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RecommendedProducts from "@/components/storefront/RecommendedProducts";

const sidebarLinks = [
  { name: "My Profile", icon: User, href: "/account/profile" },
  { name: "My Orders", icon: Package, href: "/account/orders" },
  { name: "My Invoices", icon: FileText, href: "/account/my-invoices" },
  { name: "Address Book", icon: MapPin, href: "/account/address-book" },
  { name: "Change Password", icon: Settings, href: "/account/change-password" },
  { name: "Email Preferences", icon: Mail, href: "/account/newsletter" },
  { name: "Wishlist", icon: Heart, href: "/account/wishlist" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user } } = await (supabase.auth as any).getUser();
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

          setProfile(data || { full_name: user.user_metadata?.full_name || "Valued Member" });
        } else {
          router.push("/login?returnTo=/account/profile");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [supabase]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    const { signout } = await import("@/app/actions/auth");
    await signout();
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 pt-6 sm:pt-8 pb-8">

          {/* Sidebar - Desktop Only (Sticky) */}
          <aside className="hidden md:block w-64 lg:w-72 shrink-0">
            <div className="sticky top-28">
              <Card className="flex flex-col overflow-hidden border-zinc-200">
                {/* User Identity Section */}
                <div className="p-5 text-center border-b border-zinc-100 bg-gray-50/50">
                  <div className="relative w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white text-lg font-semibold mx-auto mb-2">
                    {profile ? getInitials(profile.full_name) : <User className="w-6 h-6" />}
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-900 line-clamp-1 px-2">
                    {profile?.full_name || "Account Member"}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Member Account</p>
                </div>

                <CardContent className="flex-1 overflow-y-auto custom-scrollbar py-3 px-3">
                  <nav>
                    <ul className="space-y-1">
                      {sidebarLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${isActive
                                ? "bg-red-600 text-white"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <link.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700"}`} />
                                {link.name}
                              </div>
                              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                </CardContent>

                <Separator />
                <div className="p-3">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors group"
                  >
                    <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Sign Out
                  </button>
                </div>
              </Card>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">

            {/* Mobile Header */}
            <div className="md:hidden mb-6">
              <Card className="border-zinc-200">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {profile ? getInitials(profile.full_name) : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 leading-none">
                        {profile ? `Hi, ${profile.full_name.split(" ")[0]}` : "Hi there!"}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">Account Dashboard</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="p-2.5 bg-zinc-100 rounded-lg text-zinc-700 hover:bg-zinc-200 transition-colors"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </CardContent>
              </Card>

              {/* Mobile Slide-in Sidebar Overlay */}
              <AnimatePresence>
                {isMobileSidebarOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                    />
                    <motion.aside
                      initial={{ x: "-100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="fixed inset-y-0 left-0 w-[80%] max-w-xs bg-white z-[101] flex flex-col shadow-2xl overflow-hidden"
                    >
                      <div className="p-5 flex items-center justify-between border-b border-zinc-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                            {profile ? getInitials(profile.full_name) : <User className="w-4 h-4" />}
                          </div>
                          <span className="font-semibold text-zinc-900 text-sm">My Account</span>
                        </div>
                        <button
                          onClick={() => setIsMobileSidebarOpen(false)}
                          className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-zinc-500" />
                        </button>
                      </div>

                      <nav className="flex-1 overflow-y-auto py-3 px-3">
                        <ul className="space-y-1">
                          {sidebarLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  onClick={() => setIsMobileSidebarOpen(false)}
                                  className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-sm transition-all ${isActive
                                    ? "bg-red-600 text-white"
                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                    }`}
                                >
                                  <link.icon className={`w-4.5 h-4.5 ${isActive ? "text-white" : "text-zinc-400"}`} />
                                  {link.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </nav>

                      <div className="p-4 border-t border-zinc-100">
                        <button
                          onClick={() => {
                            setIsMobileSidebarOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Slot for page content */}
            <main className="animate-in fade-in slide-in-from-bottom-2 duration-500 min-h-[50vh]">
              {children}
            </main>

            <div className="mt-12 border-t border-zinc-200/80 pt-8">
              <RecommendedProducts maxItems={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
