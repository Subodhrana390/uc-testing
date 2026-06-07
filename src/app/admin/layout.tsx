"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  BarChart3,
  LogOut,
  Bell,
  PlusCircle,
  Clock,
  IndianRupee,
  Activity,
  Terminal,
  Image as ImageIcon,
  BadgePercent,
  Layers,
  Shield,
  ShieldCheck,
  Menu,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Settings2,
  FolderTree
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import toast from "react-hot-toast";
import "../globals.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const [adminProfile, setAdminProfile] = useState<{ full_name: string; email: string; avatar_url?: string } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") {
      setIsSidebarCollapsed(true);
    }
    document.body.style.backgroundColor = "#f5f6fa";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  const handleToggleSidebar = () => {
    const newValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(newValue);
    localStorage.setItem("admin-sidebar-collapsed", String(newValue));
  };

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isSidebarCollapsed ? "80px" : "288px"
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    async function fetchAdminProfile() {
      try {
        const { data: { user } } = await (supabase.auth as any).getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.id)
            .single();

          setAdminProfile({
            full_name: profile?.full_name || user.user_metadata?.full_name || "Admin User",
            email: user.email || "",
            avatar_url: user.user_metadata?.avatar_url || undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching admin profile:", error);
      }
    }
    fetchAdminProfile();

    async function fetchCounts() {
      try {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "Pending");
        if (count) setNewOrdersCount(count);
      } catch (error) {
        console.error("Error fetching order counts:", error);
      }
    }
    fetchCounts();
  }, [supabase]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";
  };

  // 1. Sidebar Categorization
  const sidebarSections = [
    {
      group: "Dashboard",
      items: [
        { icon: <LayoutDashboard className="w-3.5 h-3.5" />, label: "Overview", href: "/admin" }
      ]
    },
    {
      group: "Manage",
      items: [
        { icon: <Clock className="w-3.5 h-3.5" />, label: "Orders", href: "/admin/orders" },
        { icon: <IndianRupee className="w-3.5 h-3.5" />, label: "Payments", href: "/admin/payments" },
        { icon: <Activity className="w-3.5 h-3.5" />, label: "Delivery", href: "/admin/delivery" },
      ]
    },
    {
      group: "Catalog",
      items: [
        { icon: <Package className="w-3.5 h-3.5" />, label: "Products", href: "/admin/products" },
        { icon: <Layers className="w-3.5 h-3.5" />, label: "Main Categories", href: "/admin/categories/main" },
        { icon: <FolderTree className="w-3.5 h-3.5" />, label: "Sub Categories", href: "/admin/categories/sub" },
        { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Brands", href: "/admin/brands" },
        { icon: <Settings2 className="w-3.5 h-3.5" />, label: "Attributes", href: "/admin/attributes" },
        { icon: <Activity className="w-3.5 h-3.5" />, label: "Inventory", href: "/admin/inventory" },
      ]
    },
    {
      group: "Marketing",
      items: [
        { icon: <ImageIcon className="w-3.5 h-3.5" />, label: "Banners", href: "/admin/banners" },
        { icon: <BadgePercent className="w-3.5 h-3.5" />, label: "Active Deals", href: "/admin/deals" },
      ]
    },
    {
      group: "System",
      items: [
        { icon: <Users className="w-3.5 h-3.5" />, label: "Customers", href: "/admin/customers" },
        { icon: <Shield className="w-3.5 h-3.5" />, label: "Security", href: "/admin/security" },
      ]
    }
  ];

  // 2. Realtime Order Notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          toast.success(`SYSTEM: New Order #${payload.new.id.slice(0, 8).toUpperCase()} - Valuation: ₹${payload.new.total_amount}`, {
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);



  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  const toggleSection = (group: string) => {
    setCollapsedSections(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  // Helper to map each menu item to its own premium vibrant color style dynamically (adapted for crisp bright white background)
  const getMenuItemStyles = (label: string, isActive: boolean) => {
    let activeBg = "bg-indigo-50 border-indigo-200 text-indigo-700";
    let inactiveText = "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80";
    let iconColor = "text-slate-400";
    let glowShadow = "shadow-sm";

    switch (label) {
      case "Overview":
        iconColor = "text-cyan-500";
        activeBg = "bg-cyan-50 border-cyan-200 text-cyan-700";
        break;
      case "Orders":
        iconColor = "text-sky-500";
        activeBg = "bg-sky-50 border-sky-200 text-sky-700";
        break;
      case "Payments":
        iconColor = "text-amber-500";
        activeBg = "bg-amber-50 border-amber-200 text-amber-700";
        break;
      case "Delivery":
        iconColor = "text-rose-500";
        activeBg = "bg-rose-50 border-rose-200 text-rose-700";
        break;
      case "Products":
        iconColor = "text-orange-500";
        activeBg = "bg-orange-50 border-orange-200 text-orange-700";
        break;
      case "Main Categories":
        iconColor = "text-purple-500";
        activeBg = "bg-purple-50 border-purple-200 text-purple-700";
        break;
      case "Sub Categories":
        iconColor = "text-violet-500";
        activeBg = "bg-violet-50 border-violet-200 text-violet-700";
        break;
      case "Brands":
        iconColor = "text-blue-500";
        activeBg = "bg-blue-50 border-blue-200 text-blue-700";
        break;
      case "Attributes":
        iconColor = "text-fuchsia-500";
        activeBg = "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700";
        break;
      case "Inventory":
        iconColor = "text-emerald-500";
        activeBg = "bg-emerald-50 border-emerald-200 text-emerald-700";
        break;
      case "Banners":
        iconColor = "text-yellow-600";
        activeBg = "bg-yellow-50 border-yellow-200 text-yellow-800";
        break;
      case "Active Deals":
        iconColor = "text-pink-500";
        activeBg = "bg-pink-50 border-pink-200 text-pink-700";
        break;
      case "Customers":
        iconColor = "text-teal-500";
        activeBg = "bg-teal-50 border-teal-200 text-teal-700";
        break;
      case "Security":
        iconColor = "text-lime-600";
        activeBg = "bg-lime-50 border-lime-200 text-lime-700";
        break;
    }

    return {
      className: isActive
        ? cn(activeBg, glowShadow, "border translate-x-1 font-bold")
        : inactiveText,
      iconColor: isActive ? "text-inherit" : iconColor
    };
  };

  const getThemeClass = (path: string) => {
    if (path === "/admin") return "theme-overview";
    if (path.startsWith("/admin/orders")) return "theme-orders";
    if (path.startsWith("/admin/payments")) return "theme-payments";
    if (path.startsWith("/admin/delivery")) return "theme-delivery";
    if (path.startsWith("/admin/products")) return "theme-products";
    if (path.startsWith("/admin/categories/main")) return "theme-categories-main";
    if (path.startsWith("/admin/categories/sub")) return "theme-categories-sub";
    if (path.startsWith("/admin/brands")) return "theme-brands";
    if (path.startsWith("/admin/attributes")) return "theme-attributes";
    if (path.startsWith("/admin/inventory")) return "theme-inventory";
    if (path.startsWith("/admin/banners")) return "theme-banners";
    if (path.startsWith("/admin/deals")) return "theme-deals";
    if (path.startsWith("/admin/customers")) return "theme-customers";
    if (path.startsWith("/admin/security")) return "theme-security";
    return "";
  };

  if (pathname === "/admin/login") return <>{children}</>;
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa] text-slate-600 selection:bg-indigo-500 selection:text-white">

      {/* Desktop Sidebar (Collapsible Solid White Theme) */}
      <aside className={cn(
        "border-r border-slate-200/80 bg-white hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 shadow-sm transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        {/* Toggle Collapse Button */}
        <button
          onClick={handleToggleSidebar}
          className="absolute -right-3 top-7 w-6 h-6 bg-white border border-slate-200 rounded-full hidden lg:flex items-center justify-center shadow-sm hover:bg-slate-50 transition-all z-45 text-slate-500 hover:text-slate-800 cursor-pointer"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        <div className={cn("p-6 border-b border-slate-100 bg-white flex items-center", isSidebarCollapsed ? "justify-center" : "justify-between")}>
          <Link href="/admin" className="flex items-center gap-3">
            {/* Logo Image */}
            <div className="w-9 h-9 overflow-hidden flex items-center justify-center select-none shrink-0 relative">
              <Image src="/logo.png" alt="UC Logo" fill sizes="36px" className="object-contain" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-tight text-slate-800 uppercase">UC Enterprises</span>
                <span className="text-[9px] font-extrabold tracking-widest uppercase text-[#06b6d4] leading-none mt-0.5">Admin Hub</span>
              </div>
            )}
          </Link>
        </div>

        <nav className={cn("flex-1 py-6 space-y-5 overflow-y-auto scrollbar-hide", isSidebarCollapsed ? "px-2" : "px-4")}>
          {sidebarSections.map((section) => {
            const isCollapsed = collapsedSections.includes(section.group);
            return (
              <div key={section.group} className="space-y-2">
                {isSidebarCollapsed ? (
                  <>
                    <div className="h-[1px] bg-slate-100/70 my-3 mx-2" />
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const styles = getMenuItemStyles(item.label, isActive);
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                              "flex items-center transition-all rounded-xl relative group justify-center w-11 h-11 mx-auto",
                              styles.className
                            )}
                          >
                            <span className={cn("transition-colors w-4 h-4 flex items-center justify-center shrink-0", styles.iconColor)}>
                              {item.icon}
                            </span>
                            {item.label === "Orders" && (
                              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-50 border-2 border-white rounded-full animate-pulse shadow-sm" />
                            )}
                            <div className="absolute left-16 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-md">
                              {item.label}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleSection(section.group)}
                      className="flex items-center justify-between w-full px-3 py-1 group/header"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover/header:text-slate-600 transition-colors">
                        {section.group}
                      </p>
                      <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover/header:text-slate-600" />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden space-y-1"
                        >
                          {section.items.map((item) => {
                            const isActive = pathname === item.href;
                            const styles = getMenuItemStyles(item.label, isActive);
                            return (
                              <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 text-xs font-semibold tracking-wide transition-all rounded-xl relative group",
                                  styles.className
                                )}
                              >
                                <span className={cn("transition-colors w-4 h-4 flex items-center justify-center shrink-0", styles.iconColor)}>
                                  {item.icon}
                                </span>
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.label === "Orders" && newOrdersCount > 0 && (
                                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm shadow-emerald-500/20 animate-pulse">
                                    {newOrdersCount} New
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            );
          })}
        </nav>

        {/* Profile Footer with Collapsible Layout */}
        <div className={cn(
          "p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 transition-all duration-300",
          isSidebarCollapsed ? "flex-col items-center justify-center py-5" : "items-center justify-between"
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            {adminProfile?.avatar_url ? (
              <Image
                src={adminProfile.avatar_url}
                alt={adminProfile.full_name}
                width={36}
                height={36}
                className="rounded-full object-cover border border-slate-200 shadow-md shadow-cyan-500/10 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-md shadow-cyan-500/10 select-none shrink-0">
                {getInitials(adminProfile?.full_name || "Admin User")}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate leading-none">
                  {adminProfile?.full_name || "Admin User"}
                </span>
                <span className="text-[9px] font-bold text-[#06b6d4] uppercase tracking-wider mt-1.5 leading-none">Active Admin</span>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              const { adminSignout } = await import("@/app/actions/auth");
              await adminSignout();
            }}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer",
              isSidebarCollapsed ? "mt-2" : ""
            )}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 h-screen overflow-y-auto bg-[#f5f6fa]",
        isSidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}>
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200/80 flex items-center justify-start gap-4 px-4 sm:px-6 sticky top-0 z-20 shadow-sm py-8">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center bg-slate-50 rounded-lg shrink-0 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 overflow-hidden flex items-center justify-center shrink-0 relative">
              <Image src="/logo.png" alt="UC" fill sizes="28px" className="object-contain" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-800">Admin Panel</span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className={cn("admin-dashboard-main flex-1 p-2 pt-6 sm:p-4 sm:pt-8 lg:p-10 max-w-[1500px] mx-auto w-full", getThemeClass(pathname))}>
          <Suspense fallback={
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">Loading Dashboard Data...</p>
            </div>
          }>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </motion.div>
          </Suspense>
        </main>
      </div>

      {/* Mobile Drawer (Clean Solid White Theme!) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[210] lg:hidden flex flex-col border-r border-slate-200 shadow-2xl rounded-r-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-white text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 overflow-hidden flex items-center justify-center shrink-0 relative">
                    <Image src="/logo.png" alt="UC Logo" fill sizes="36px" className="object-contain" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-800">Admin Hub</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <nav className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-hide">
                {sidebarSections.map((section) => (
                  <div key={section.group} className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 px-2">{section.group}</p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const styles = getMenuItemStyles(item.label, isActive);
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3.5 px-4 py-3.5 text-xs font-semibold tracking-wide transition-all rounded-xl",
                              styles.className
                            )}
                          >
                            <span className={cn("w-4 h-4 flex items-center justify-center", styles.iconColor)}>{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.label === "Orders" && (
                              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                12
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {adminProfile?.avatar_url ? (
                    <Image
                      src={adminProfile.avatar_url}
                      alt={adminProfile.full_name}
                      width={36}
                      height={36}
                      className="rounded-full object-cover border border-slate-200 shadow-md shadow-cyan-500/10"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                      {getInitials(adminProfile?.full_name || "Admin User")}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">
                      {adminProfile?.full_name || "Admin User"}
                    </span>
                    <span className="text-[9px] font-bold text-[#06b6d4] uppercase tracking-wider mt-1">Active Admin</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const { adminSignout } = await import("@/app/actions/auth");
                    await adminSignout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}