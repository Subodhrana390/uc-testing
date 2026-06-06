"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  Filter,
  X,
  Loader2,
  Activity,
  AlertTriangle,
  Boxes,
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";

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
  AreaChart,
  Area,
} from "recharts";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type StatusType = "All" | "Active" | "Draft";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    status: "All",
    category: "All",
    stock: "All"
  });

  const supabase = useMemo(() => createClient(), []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products catalog");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    setIsMounted(true);
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.categories?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filters.status === "All" || p.status === filters.status;
      const matchesCategory = filters.category === "All" || p.categories?.name === filters.category;
      const matchesStock = filters.stock === "All" ||
        (filters.stock === "Out of Stock" && p.stock_quantity === 0) ||
        (filters.stock === "Low Stock" && p.stock_quantity > 0 && p.stock_quantity <= 10) ||
        (filters.stock === "In Stock" && p.stock_quantity > 10);

      return matchesSearch && matchesStatus && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, filters]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.status === "Active").length;
    const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
    const outOfStock = products.filter(p => p.stock_quantity === 0).length;

    return { total, active, lowStock, outOfStock };
  }, [products]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const catName = p.categories?.name || "Uncategorized";
      counts[catName] = (counts[catName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [products]);

  const stockChartData = useMemo(() => {
    const healthy = products.filter(p => p.stock_quantity > 10).length;
    const low = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
    const out = products.filter(p => p.stock_quantity === 0).length;

    return [
      { name: "Healthy", value: healthy, color: "#10b981" },
      { name: "Low Stock", value: low, color: "#f59e0b" },
      { name: "Out of Stock", value: out, color: "#ef4444" }
    ];
  }, [products]);

  const dailyAddTrends = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map(date => {
      const dayProducts = products.filter(p => p.created_at?.startsWith(date));
      return {
        date,
        count: dayProducts.length,
        lowStock: dayProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length,
        outOfStock: dayProducts.filter(p => p.stock_quantity === 0).length,
      };
    });
  }, [products]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.categories?.name).filter(Boolean)));
  }, [products]);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success("Product deleted successfully");
      setProductToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const base = "text-[11px] font-medium px-2.5 py-0.5 border rounded-lg flex items-center gap-1.5 w-fit";
    switch (status.toLowerCase()) {
      case "active":
        return `${base} bg-teal-50 text-teal-700 border-teal-100`;
      case "draft":
        return `${base} bg-zinc-100 text-zinc-500 border-zinc-200`;
      default:
        return `${base} bg-zinc-100 text-zinc-500 border-zinc-200`;
    }
  };

  const getStockColor = (qty: number) => {
    if (qty === 0) return { text: "text-red-700", bg: "bg-red-50", border: "border-red-100", bar: "bg-red-500" };
    if (qty <= 10) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", bar: "bg-amber-500" };
    return { text: "text-teal-700", bg: "bg-teal-50", border: "border-teal-100", bar: "bg-teal-600" };
  };

  if (loading) return <LogoLoader text="Loading products catalog..." />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Orange Gradient Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Header System */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Catalog Management</h1>
            <p className="text-sm font-medium text-orange-100 mt-1">
              Manage your industrial catalog, track stock counts, and edit product specifications.
            </p>
          </div>
          <Link href="/admin/products/add" passHref legacyBehavior>
            <Button className="h-11 px-5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl transition-all border border-white/10 shadow-sm gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </Link>
        </div>

        {/* Catalog Stats Matrix */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Total Products</span>
                <Boxes className="w-4 h-4 text-white/70" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.total}</div>
                <div className="text-[10px] text-orange-100/60 font-semibold mt-1">7 Days Additions</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyAddTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-total-prod" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="count" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-total-prod)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Active Catalog</span>
                <Activity className="w-4 h-4 text-white/85" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.active}</div>
                <div className="text-[10px] text-orange-100/60 font-semibold mt-1">Live in store</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyAddTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-active-prod" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="count" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-active-prod)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Low Stock Nodes</span>
                <AlertTriangle className="w-4 h-4 text-white/85" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.lowStock}</div>
                <div className="text-[10px] text-orange-100/60 font-semibold mt-1">Needs attention</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyAddTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-low-stock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="lowStock" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-low-stock)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Out of Stock</span>
                <TrendingDown className="w-4 h-4 text-white/85" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.outOfStock}</div>
                <div className="text-[10px] text-orange-100/60 font-semibold mt-1">Critically depleted</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyAddTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-out-stock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="outOfStock" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-out-stock)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Category Distribution Chart */}
        <Card className="bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Category Distribution</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Product count by categories (Top 5)</p>
          </div>
          <div className="h-[260px] w-full mt-4 -ml-4">
            {isMounted && products.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="categoryBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fdba74" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} width={90} />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-[#f97316] text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {payload[0].payload.name}
                            </p>
                            <p className="text-sm font-black">
                              {payload[0].value} products
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="url(#categoryBarGrad)" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <p className="text-[10px] font-black uppercase tracking-widest">No category data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* Stock Level Overview Donut Chart */}
        <Card className="bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Stock Level Overview</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Stock status distribution</p>
          </div>
          <div className="h-[260px] w-full mt-4 flex items-center justify-center relative">
            {isMounted && products.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stockChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percentage = ((data.value / (products.length || 1)) * 100).toFixed(1);
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {data.name}
                            </p>
                            <p className="text-sm font-black">
                              {data.value} items ({percentage}%)
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
                <p className="text-[10px] font-black uppercase tracking-widest">No stock level data available</p>
              </div>
            )}

            {/* Center Text inside Donut Hole */}
            {isMounted && products.length > 0 && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#18181b]">{stats.total}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total SKUs</span>
              </div>
            )}
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            {[
              { label: "Healthy (>10)", color: "#10b981" },
              { label: "Low Stock (1-10)", color: "#f59e0b" },
              { label: "Out of Stock (0)", color: "#ef4444" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Table Interface Structural Card */}
      <Card className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden text-[#18181b]">

        {/* Table Advanced Filters Layer */}
        <div className="p-5 border-b border-zinc-200 bg-zinc-50/50 flex flex-col gap-4">
          {/* Main Action Control Search Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by product name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] transition-all placeholder:text-zinc-400 text-[#18181b]"
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
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className={cn(
                  "h-11 px-4 border-zinc-200 rounded-xl gap-2 text-sm font-semibold transition-all shadow-sm w-full sm:w-auto justify-center text-[#18181b] relative",
                  showFilters ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800" : "bg-white hover:bg-zinc-50"
                )}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide Filters" : "Filters"}
                {(filters.status !== "All" || filters.category !== "All" || filters.stock !== "All") && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f97316] rounded-full animate-pulse" />
                )}
              </Button>
              {(filters.status !== "All" || filters.category !== "All" || filters.stock !== "All") && (
                <Button
                  onClick={() => setFilters({ status: "All", category: "All", stock: "All" })}
                  variant="destructive"
                  className="h-11 w-11 p-0 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-150 shrink-0 font-bold"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Dropdown Filtration Sub-Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-zinc-250">
              <div className="space-y-1.5 text-left">
                <span className="text-[11px] font-bold text-zinc-400 tracking-wider ml-0.5 uppercase">Live Status</span>
                <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val || "All" })}>
                  <SelectTrigger className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus:ring-[#f97316] text-[#18181b]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-zinc-200 rounded-xl">
                    <SelectItem value="All" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="Active" className="text-xs">Active Only</SelectItem>
                    <SelectItem value="Draft" className="text-xs">Drafts Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 text-left">
                <span className="text-[11px] font-bold text-zinc-400 tracking-wider ml-0.5 uppercase">Category</span>
                <Select value={filters.category} onValueChange={(val) => setFilters({ ...filters, category: val || "All" })}>
                  <SelectTrigger className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus:ring-[#f97316] text-[#18181b]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                    <SelectItem value="All" className="text-xs">All Categories</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 text-left">
                <span className="text-[11px] font-bold text-zinc-400 tracking-wider ml-0.5 uppercase">Inventory Level</span>
                <Select value={filters.stock} onValueChange={(val) => setFilters({ ...filters, stock: val || "All" })}>
                  <SelectTrigger className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus:ring-[#f97316] text-[#18181b]">
                    <SelectValue placeholder="Any Stock Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-zinc-200 rounded-xl">
                    <SelectItem value="All" className="text-xs">Any Stock Level</SelectItem>
                    <SelectItem value="In Stock" className="text-xs">In Stock (&gt;10)</SelectItem>
                    <SelectItem value="Low Stock" className="text-xs">Low Stock (1-10)</SelectItem>
                    <SelectItem value="Out of Stock" className="text-xs">Out of Stock (0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Tabular Segment */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider pl-8 w-28">Asset Image</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Product Details</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider w-52">Inventory Level & Gauge</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Commercial Price</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Store Status</th>
                <th className="w-20 pr-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100 shadow-inner">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-zinc-800 mt-2">No products found</p>
                      <p className="text-xs text-zinc-400 max-w-[240px]">We couldn't find any products matching your criteria.</p>
                      {(searchQuery || filters.status !== "All" || filters.category !== "All" || filters.stock !== "All") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setFilters({ status: "All", category: "All", stock: "All" });
                          }}
                          className="mt-2 text-xs border-zinc-200 hover:bg-zinc-50"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockColor = getStockColor(product.stock_quantity);
                  const stockPercent = Math.min((product.stock_quantity / 100) * 100, 100);

                  return (
                    <tr key={product.id} className="hover:bg-zinc-50 even:bg-zinc-50/30 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm group">
                    {/* Asset Image */}
                    <td className="px-6 py-4 pl-8">
                      <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 rounded-xl flex items-center justify-center p-1.5 shrink-0 shadow-sm transition-all duration-300">
                        <img
                          src={product.image_url || "/images/prod_main.png"}
                          alt={product.name}
                          className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </td>

                    {/* Product Details */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 max-w-[260px]">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider block">
                          {product.categories?.name || "Catalog Asset"}
                        </span>
                        <span className="text-sm font-semibold text-[#18181b] block truncate">{product.name}</span>
                        <span className="font-mono text-[11px] text-zinc-400 block">
                          SKU: {product.sku || "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Inventory Gauge */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border shrink-0", stockColor.bg, stockColor.border, stockColor.text)}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", stockColor.bar)} />
                            {product.stock_quantity === 0 ? "Out of Stock" : `${product.stock_quantity} units`}
                          </span>
                          <span className="text-[11px] text-zinc-500 whitespace-nowrap">MOQ: {product.moq || 1}</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-150 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", stockColor.bar)}
                            style={{ width: `${product.stock_quantity === 0 ? 100 : stockPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-[#18181b] block">
                          ₹{parseFloat(product.price).toLocaleString('en-IN')}
                        </span>
                        {product.sale_price && (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg inline-block font-sans">
                            Promo: ₹{parseFloat(product.sale_price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={getStatusStyle(product.status)}>
                        {product.status}
                      </span>
                    </td>

                    {/* Context Grid Actions Trigger Dropdown */}
                    <td className="px-6 py-4 text-right pr-8 relative">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/products/${product.id}`} passHref legacyBehavior>
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-lg text-zinc-400 hover:text-[#f97316] hover:bg-zinc-100">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>

                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === product.id ? null : product.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-50 border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-800"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeDropdown === product.id && (
                            <div className="absolute right-0 top-10 w-52 bg-white border border-zinc-200 shadow-lg rounded-xl z-50 p-1.5 text-left">
                              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1">Product Actions</div>
                              <Link href={`/admin/products/${product.id}`} passHref legacyBehavior>
                                <a className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-all rounded-lg">
                                  <Edit className="w-4 h-4 text-zinc-400" /> Full Editor
                                </a>
                              </Link>
                              <a
                                href={`/products/${product.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-all rounded-lg"
                              >
                                <ExternalLink className="w-4 h-4 text-zinc-400" /> Live Store view
                              </a>
                              <div className="h-px bg-zinc-100 my-1 mx-1" />
                              <button
                                onClick={() => {
                                  setProductToDelete(product);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" /> Delete Asset
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
              <div className="w-16 h-16 bg-zinc-50 border border-zinc-150 flex items-center justify-center rounded-2xl">
                <Package className="w-8 h-8 text-zinc-300" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-sm font-bold text-[#18181b]">No Products Found</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">We couldn't find any products matching your current search parameters.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Metadata Info Ledger */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/50">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Audit Log: {filteredProducts.length} assets matching query criteria
          </p>
        </div>
      </Card>

      {/* Global Click Shield Backdrop Layer */}
      {activeDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
      )}

      {/* Delete Confirmation Alert Dialog */}
      <Dialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl text-[#18181b] z-50">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Product</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{productToDelete?.name}</span> from the catalog database? This operational choice is destructive and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setProductToDelete(null)}
              className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              variant="destructive"
              className="h-10 rounded-xl gap-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dropping Row...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Asset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}