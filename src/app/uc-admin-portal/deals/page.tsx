"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  BadgePercent,
  X,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  Filter,
  Sparkles,
  Zap,
  Percent,
} from "lucide-react";
import toast from "react-hot-toast";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { cn } from "@/lib/utils";
import SingleImageUpload from "@/components/admin/SingleImageUpload";
import LogoLoader from "@/components/ui/LogoLoader";
import { Pagination } from "@/components/ui/pagination";

// Recharts imports
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// shadcn/ui primitives
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

function getDealStatus(deal: any): { label: string; color: string } {
  if (!deal.status) return { label: "Suspended", color: "bg-zinc-100 text-zinc-500 border-zinc-200" };
  const now = new Date();
  if (deal.start_date && new Date(deal.start_date) > now) return { label: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100" };
  if (deal.end_date && new Date(deal.end_date) < now) return { label: "Expired", color: "bg-red-50 text-red-600 border-red-100" };
  return { label: "Live", color: "bg-teal-50 text-teal-700 border-teal-100" };
}

export default function DealsAdminPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    badge_text: "",
    image_url: "",
    link_url: "",
    discount_percentage: "",
    start_date: "",
    end_date: "",
    position: 0,
    status: true,
    product_id: ""
  });
  const [productSearch, setProductSearch] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const supabase = useMemo(() => createClient(), []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase.from("deals").select("*, products(name)").order("position", { ascending: true });
      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchDeals();
  }, [supabase]);

  const discountTypeData = useMemo(() => {
    const percentageDeals = deals.filter(d => d.discount_percentage !== null && d.discount_percentage !== undefined && d.discount_percentage !== "").length;
    const flatDeals = deals.length - percentageDeals;
    return [
      { name: "Percentage Discount", value: percentageDeals, color: "#ec4899" },
      { name: "Fixed / Flat Price", value: flatDeals, color: "#64748b" }
    ];
  }, [deals]);

  const topDiscountsData = useMemo(() => {
    return deals
      .filter(d => d.discount_percentage)
      .map(d => ({
        name: d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title,
        discount: Number(d.discount_percentage)
      }))
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 5);
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter(d =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.badge_text || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.products?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [deals, searchQuery]);

  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeals.slice(start, start + pageSize);
  }, [filteredDeals, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const searchProducts = async (q: string) => {
    if (!q) { setProducts([]); return; }
    setProductLoading(true);
    try {
      const { data } = await supabase.from("products").select("id, name").ilike("name", `%${q}%`).limit(5);
      setProducts(data || []);
    } finally { setProductLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleOpenDrawer = (deal?: any) => {
    if (deal) {
      setEditingDeal(deal);
      setFormData({
        title: deal.title,
        description: deal.description || "",
        badge_text: deal.badge_text || "",
        image_url: deal.image_url || "",
        link_url: deal.link_url || "",
        discount_percentage: deal.discount_percentage?.toString() || "",
        start_date: deal.start_date ? new Date(deal.start_date).toISOString().split('T')[0] : "",
        end_date: deal.end_date ? new Date(deal.end_date).toISOString().split('T')[0] : "",
        position: deal.position,
        status: deal.status,
        product_id: deal.product_id || ""
      });
      setProductSearch(deal.products?.name || "");
    } else {
      setEditingDeal(null);
      setFormData({ title: "", description: "", badge_text: "", image_url: "", link_url: "", discount_percentage: "", start_date: "", end_date: "", position: deals.length, status: true, product_id: "" });
      setProductSearch("");
    }
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload = { 
        ...formData, 
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        product_id: formData.product_id || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };
      
      if (editingDeal) {
        const { error } = await supabase.from("deals").update(payload).eq("id", editingDeal.id);
        if (error) throw error;
        toast.success("Deal updated");
      } else {
        const { error } = await supabase.from("deals").insert([payload]);
        if (error) throw error;
        toast.success("Deal created");
      }

      setIsDrawerOpen(false);
      fetchDeals();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (deal: any) => {
    try {
      const newStatus = !deal.status;
      const { error } = await supabase.from("deals").update({ status: newStatus }).eq("id", deal.id);
      if (error) throw error;
      
      setDeals(deals.map(d => d.id === deal.id ? { ...d, status: newStatus } : d));
      toast.success(newStatus ? "Deal reactivated" : "Deal suspended");
    } catch (error: any) { toast.error(error.message); }
  };

  const handleConfirmDelete = async () => {
    if (!dealToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("deals").delete().eq("id", dealToDelete.id);
      if (error) throw error;
      setDeals(deals.filter(d => d.id !== dealToDelete.id));
      toast.success("Deal removed");
      setDealToDelete(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LogoLoader text="Loading deals & offers..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 relative">
      {/* Pink Gradient Banner */}
      <div className="bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Deals & Offers</h1>
            <p className="text-sm font-medium text-pink-50 mt-1">Manage promotional campaigns and seasonal discounts</p>
          </div>
          <Button
            onClick={() => handleOpenDrawer()}
            className="h-11 px-5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl transition-all border border-white/10 shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            Initialize Campaign
          </Button>
        </div>

        {/* Analytics Summary Core Matrix */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-3 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-pink-100 uppercase tracking-wider">Total Campaigns</span>
              <Sparkles className="w-4 h-4 text-pink-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">{deals.length}</div>
              <p className="text-[11px] text-pink-200/70 mt-1">Promotional offers</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-pink-100 uppercase tracking-wider">Live & Active</span>
              <Zap className="w-4 h-4 text-pink-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {deals.filter(d => {
                  const status = getDealStatus(d);
                  return status.label === "Live";
                }).length}
              </div>
              <p className="text-[11px] text-pink-200/70 mt-1">Currently running</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-pink-100 uppercase tracking-wider">Avg. Discount</span>
              <Percent className="w-4 h-4 text-pink-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {Math.round(
                  deals.reduce((acc, d) => acc + (Number(d.discount_percentage) || 0), 0) /
                  (deals.filter(d => d.discount_percentage).length || 1)
                )}%
              </div>
              <p className="text-[11px] text-pink-200/70 mt-1">Campaign discount rate</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Discounts Bar Chart */}
        <Card className="lg:col-span-2 bg-white border border-zinc-150 shadow-sm rounded-2xl p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Campaign Incentives</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Top promotional discount rates (Top 5)</p>
          </div>
          <div className="h-[240px] w-full mt-4 -ml-4">
            {isMounted && deals.length > 0 && topDiscountsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDiscountsData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dealBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} width={30} unit="%" />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-pink-500 text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {payload[0].payload.name}
                            </p>
                            <p className="text-sm font-black">
                              {payload[0].value}% OFF
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="discount" fill="url(#dealBarGrad)" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <p className="text-[10px] font-black uppercase tracking-widest">No active campaign discount data</p>
              </div>
            )}
          </div>
        </Card>

        {/* Discount Type Donut Chart */}
        <Card className="lg:col-span-1 bg-white border border-zinc-150 shadow-sm rounded-2xl p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Campaign Type</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Discount model distribution</p>
          </div>
          <div className="h-[240px] w-full mt-4 flex items-center justify-center relative">
            {isMounted && deals.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={discountTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {discountTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percentage = ((data.value / (deals.length || 1)) * 100).toFixed(1);
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {data.name}
                            </p>
                            <p className="text-sm font-black">
                              {data.value} campaigns ({percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <p className="text-[10px] font-black uppercase tracking-widest">No campaign data available</p>
              </div>
            )}

            {/* Center Text inside Donut Hole */}
            {isMounted && deals.length > 0 && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[#18181b]">{deals.length}</span>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Offers</span>
              </div>
            )}
          </div>

          {/* Custom Legends */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {discountTypeData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden py-0 gap-0">
        {/* Filtration Header */}
        <div className="p-5 border-b border-zinc-100 bg-zinc-50/30">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search promotions by title or badge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder:text-zinc-400 text-[#18181b]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all duration-150 animate-in fade-in zoom-in-75"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-28 pl-8">Banner</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Offer Title</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Discount</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="w-24 pr-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedDeals.map((deal) => {
                const status = getDealStatus(deal);
                return (
                  <tr key={deal.id} className="hover:bg-zinc-50/50 even:bg-zinc-50/20 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm group">
                    <td className="px-6 py-4 pl-8">
                      <div className="w-16 h-11 bg-zinc-100 rounded-xl border border-zinc-200/60 overflow-hidden transition-all flex items-center justify-center shrink-0">
                        {deal.image_url ? (
                          <Image src={deal.image_url} alt="" width={64} height={44} className="w-full h-full object-cover" />
                        ) : (
                          <BadgePercent className="w-5 h-5 text-pink-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-zinc-700 block">{deal.title}</span>
                        <span className="text-[11px] font-medium text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-lg inline-block">
                          {deal.badge_text || "Promo Deal"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-zinc-700 block">
                          {deal.discount_percentage ? `${deal.discount_percentage}% OFF` : "Fixed Price"}
                        </span>
                        {deal.end_date && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Till: {new Date(deal.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={deal.status}
                          onCheckedChange={() => handleToggleActive(deal)}
                        />
                        <span
                          onClick={() => handleToggleActive(deal)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 cursor-pointer select-none transition-all",
                            status.color,
                            deal.status ? "hover:bg-teal-100/80" : "hover:bg-zinc-200/80"
                          )}
                        >
                          {status.label === "Live" && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />}
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right pr-8 relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-all ml-auto">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border-zinc-200 shadow-lg rounded-xl p-1.5">
                          <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1">
                            Deal Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleOpenDrawer(deal)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-all rounded-lg cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-zinc-400" /> Edit Deal
                          </DropdownMenuItem>
                          <div className="h-px bg-zinc-100 my-1 mx-1" />
                          <DropdownMenuItem
                            onClick={() => setDealToDelete(deal)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all rounded-lg cursor-pointer focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" /> Delete Deal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDeals.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredDeals.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            variantColor="pink"
          />
        )}

        {/* Empty Fallback State */}
        {filteredDeals.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
            <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-100">
              <BadgePercent className="w-8 h-8 text-zinc-300" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-sm font-bold text-[#18181b]">No Deals Found</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">We couldn't find any promotional campaigns matching your search query.</p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs border-zinc-200 hover:bg-zinc-50"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Configuration Drawer via Shadcn Sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white rounded-l-2xl border-l border-zinc-100 p-0 flex flex-col overflow-hidden">
          <SheetHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30">
            <SheetTitle className="text-lg font-bold text-zinc-800">Deal Details</SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-0.5">
              Configure your promotional campaign item criteria.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-medium text-zinc-500">Deal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                placeholder="e.g. SUMMER BLAST SALE"
              />
            </div>

            {/* Product Link Search */}
            <div className="space-y-2">
              <Label htmlFor="product" className="text-xs font-medium text-zinc-500">Link to Product</Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="product"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-10 h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                  placeholder="Search product..."
                />
                {products.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 shadow-xl z-50 p-1.5 mt-1.5 rounded-xl space-y-0.5">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setFormData({ ...formData, product_id: p.id }); setProductSearch(p.name); setProducts([]); }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-all rounded-lg"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Percent & Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount" className="text-xs font-medium text-zinc-500">Discount %</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount_percentage}
                  onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                  className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge" className="text-xs font-medium text-zinc-500">Badge Text</Label>
                <Input
                  id="badge"
                  value={formData.badge_text}
                  onChange={e => setFormData({ ...formData, badge_text: e.target.value })}
                  className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                  placeholder="e.g. MEGA DEAL"
                />
              </div>
            </div>

            {/* Timeline Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-xs font-medium text-zinc-500">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-xs font-medium text-zinc-500">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
                />
              </div>
            </div>

            {/* Upload Area */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-zinc-500">Promo Banner</Label>
              <SingleImageUpload
                value={formData.image_url}
                onChange={(url: string) => setFormData({ ...formData, image_url: url })}
                bucket="deals"
              />
            </div>
          </form>

          {/* Form Action Footer */}
          <div className="p-6 border-t border-zinc-100 bg-zinc-50/30">
            <Button
              disabled={saving}
              onClick={handleSubmit}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 rounded-xl text-sm font-medium transition-all shadow-sm gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Promotion
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!dealToDelete} onOpenChange={(open) => !open && setDealToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Deal</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Are you sure you want to delete the promotional deal <span className="font-semibold text-zinc-700">{dealToDelete?.title || "this deal"}</span>? This will remove the deal permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDealToDelete(null)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 rounded-xl"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Deal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}