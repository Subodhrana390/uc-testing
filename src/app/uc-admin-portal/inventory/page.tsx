"use client";

import { useEffect, useState, useMemo } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Package,
  Search,
  Plus,
  Minus,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Check,
  X,
  Pencil,
  Loader2,
  AlertTriangle,
  Activity,
  TrendingDown
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import { Pagination } from "@/components/ui/pagination";

// Server Actions
import { adjustStock, getInventoryDashboardStats, getLowStockProducts, getInventoryTransactions } from "@/app/actions/inventory";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Recharts components
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart
} from "recharts";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState<string>("ledger");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<number>(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Stock Movement History States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState("");

  const supabase = useMemo(() => createClient(), []);

  // Debounced search for history tab
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHistorySearch(historySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [historySearch]);

  const fetchTransactions = async () => {
    setHistoryLoading(true);
    try {
      const res = await getInventoryTransactions({
        page: historyPage,
        pageSize: historyPageSize,
        search: debouncedHistorySearch,
      });
      if (res.success && res.data) {
        setTransactions(res.data);
        setHistoryTotal(res.count);
      } else {
        toast.error(res.error || "Failed to load stock movements");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load stock movements");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchTransactions();
    }
  }, [activeTab, historyPage, historyPageSize, debouncedHistorySearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [debouncedHistorySearch]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Fetch Dashboard Stats via Server Action
      const statsRes = await getInventoryDashboardStats();
      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // Fetch Products and Variants for the Ledger
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, stock_quantity, low_stock_threshold, manage_stock, created_at,
          categories(name),
          product_variants(id, name, stock_quantity, sku)
        `)
        .order("stock_quantity", { ascending: true });

      if (error) throw error;
      
      // Flatten products and variants for the table
      const flattenedInventory: any[] = [];
      data?.forEach(p => {
        if (p.product_variants && p.product_variants.length > 0) {
          p.product_variants.forEach((v: any) => {
            flattenedInventory.push({
              id: p.id,
              variant_id: v.id,
              name: `${p.name} - ${v.name}`,
              sku: v.sku,
              stock_quantity: v.stock_quantity,
              category: Array.isArray(p.categories) ? p.categories[0]?.name : (p.categories as any)?.name,
              threshold: p.low_stock_threshold,
              created_at: p.created_at,
              is_variant: true
            });
          });
        } else if (p.manage_stock) {
          flattenedInventory.push({
            id: p.id,
            variant_id: null,
            name: p.name,
            sku: p.id,
            stock_quantity: p.stock_quantity,
            category: Array.isArray(p.categories) ? p.categories[0]?.name : (p.categories as any)?.name,
            threshold: p.low_stock_threshold,
            created_at: p.created_at,
            is_variant: false
          });
        }
      });

      setProducts(flattenedInventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to sync inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [supabase]);

  const handleUpdateStock = async (id: string, variantId: string | null, newQuantity: number, currentQuantity: number) => {
    if (newQuantity < 0) return toast.error("Stock cannot be negative");
    
    const adjustment = newQuantity - currentQuantity;
    if (adjustment === 0) return; // No change

    setUpdatingId(variantId || id);
    try {
      const res = await adjustStock({
        productId: id,
        variantId: variantId,
        quantity: adjustment,
        reason: "Manual Admin Adjustment",
        notes: `Adjusted from Dashboard via direct edit`
      });

      if (!res.success) throw new Error(res.error);
      
      toast.success("Stock level updated and logged");
      
      // Optimistic update
      setProducts(prev => prev.map(p => 
        (p.id === id && p.variant_id === variantId) ? { ...p, stock_quantity: newQuantity } : p
      ));
      
      // Update stats optimistically if possible, or refetch
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || "Failed to update stock");
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditing = (uniqueId: string, currentQty: number) => {
    setEditingId(uniqueId);
    setEditingValue(currentQty);
  };

  const handleInlineUpdate = async (product: any, newQuantity: number) => {
    const uniqueId = product.variant_id || product.id;
    setEditingId(null);
    await handleUpdateStock(product.id, product.variant_id, newQuantity, product.stock_quantity);
  };

  const getStockStatus = (quantity: number, threshold: number = 5) => {
    if (quantity === 0) return { label: "Out of Stock", value: "depleted", color: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-600" };
    if (quantity <= threshold) return { label: "Low Stock", value: "critical", color: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500 animate-pulse" };
    return { label: "In Stock", value: "stable", color: "bg-teal-50 text-teal-700 border-teal-100", dot: "bg-teal-600" };
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const statusObj = getStockStatus(p.stock_quantity, p.threshold);
      const matchesFilter = statusFilter === "all" || statusObj.value === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [products, searchQuery, statusFilter]);

  // Reset page to 1 when filters or query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Chart Analytics Dataset 1: Structural Categorization Breakdown
  const distributionDataset = useMemo(() => {
    let depleted = 0;
    let critical = 0;
    let stable = 0;

    products.forEach(p => {
      if (p.stock_quantity === 0) depleted++;
      else if (p.stock_quantity <= (p.threshold || 5)) critical++;
      else stable++;
    });

    return [
      { name: "Stable Stock", count: stable, fill: "#0d9488" },
      { name: "Low Stock", count: critical, fill: "#f59e0b" },
      { name: "Out of Stock", count: depleted, fill: "#ef4444" }
    ];
  }, [products]);

  // Chart Analytics Dataset 2: Chronological Timeline Velocities
  const trendDataset = useMemo(() => {
    const monthlyData: { [key: string]: { name: string; StockVolume: number; SKUCount: number } } = {};

    [...products].reverse().forEach(p => {
      const date = p.created_at ? new Date(p.created_at) : new Date();
      const month = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      if (!monthlyData[month]) {
        monthlyData[month] = { name: month, StockVolume: 0, SKUCount: 0 };
      }
      monthlyData[month].StockVolume += p.stock_quantity;
      monthlyData[month].SKUCount += 1;
    });

    return Object.values(monthlyData);
  }, [products]);

  const exportToCSV = () => {
    if (!filteredProducts.length) return toast.error("No dataset available to export");

    const headers = ["SKU,Product Name,Category,Stock Volume,Status\n"];
    const rows = filteredProducts.map(p =>
      `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.category || "Uncategorized"}",${p.stock_quantity},"${getStockStatus(p.stock_quantity, p.threshold).label}"`
    );

    const blob = new Blob([headers.concat(rows.join("\n")).join("")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Inventory_Manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file manifested successfully");
  };

  if (loading && products.length === 0) return <LogoLoader text="Loading physical inventory ledger..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">

      {/* Emerald Gradient Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Stock Inventory</h1>
            <p className="text-sm font-medium text-emerald-50 mt-1">Monitor ledgers, variants, and update product availability in real-time</p>
          </div>
        </div>

        {/* Analytics Summary Core Matrix */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Total Products</span>
              <Package className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">{stats?.totalProducts || 0}</div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Managed items</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Inventory Value</span>
              <Activity className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                ₹{stats?.totalValue?.toLocaleString() || 0}
              </div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Estimated physical worth</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Low Stock</span>
              <AlertTriangle className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {stats?.lowStockCount || 0}
              </div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Approaching thresholds</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Out of Stock</span>
              <TrendingDown className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {stats?.outOfStockCount || 0}
              </div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Depleted items</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unified Tab Workspace System */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-2">
          <TabsList className="bg-zinc-100/80 p-1 rounded-xl h-11 flex w-fit">
            <TabsTrigger value="ledger" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm">
              Live Stock Ledger
            </TabsTrigger>
            <TabsTrigger value="distribution" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm gap-1.5 flex items-center">
              <PieIcon className="w-3.5 h-3.5 text-zinc-500" /> Stock Distribution
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm gap-1.5 flex items-center">
              <Activity className="w-3.5 h-3.5 text-zinc-500" /> Stock Movement History
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activeTab === "ledger" && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <Button onClick={exportToCSV} variant="outline" className="h-10 px-4 border-zinc-200 rounded-xl gap-2 text-zinc-600 text-sm font-medium shadow-sm hover:bg-zinc-50 transition-colors">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
                </Button>
              </div>
            )}
            <Button onClick={fetchInventory} variant="outline" className="h-10 w-10 p-0 border-zinc-200 rounded-xl text-zinc-600 shadow-sm hover:bg-zinc-50 transition-colors">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Tab 1: Live Stock Table Ledger */}
        <TabsContent value="ledger" className="space-y-4 outline-none">
          <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 items-center bg-zinc-50/30">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search stock by product name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all placeholder:text-zinc-400 text-[#18181b]"
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
              <div className="w-full sm:w-48 shrink-0">
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                  <SelectTrigger className="h-11 border-zinc-200 rounded-xl text-sm focus:ring-teal-600">
                    <SelectValue placeholder="All Stock Levels" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                    <SelectItem value="all" className="text-xs">All Stock Levels</SelectItem>
                    <SelectItem value="stable" className="text-xs text-teal-600 font-medium">In Stock</SelectItem>
                    <SelectItem value="critical" className="text-xs text-amber-600 font-medium">Low Stock</SelectItem>
                    <SelectItem value="depleted" className="text-xs text-red-600 font-medium">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-zinc-50/70 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-8">Product / Variant Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Current Stock</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stock Status</th>
                    <th className="w-32 pr-8 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Adjust (Ledger)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paginatedProducts.map((product) => {
                    const status = getStockStatus(product.stock_quantity, product.threshold);
                    const uniqueId = product.variant_id || product.id;
                    
                    return (
                      <tr key={uniqueId} className="hover:bg-zinc-50/50 even:bg-zinc-50/20 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm group">
                        <td className="px-6 py-4 pl-8">
                          <div className="space-y-0.5">
                            <span className="text-sm font-medium text-zinc-700 block">{product.name}</span>
                            <span className="text-[11px] text-zinc-400 font-mono">SKU: {product.sku?.toUpperCase().slice(0, 12)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-lg inline-block">
                            {product.category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {editingId === uniqueId ? (
                            <div className="flex items-center justify-center gap-1 animate-in fade-in duration-200">
                              <input
                                type="number"
                                min="0"
                                value={editingValue}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setEditingValue(isNaN(val) ? 0 : val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleInlineUpdate(product, editingValue);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                className="w-16 text-center h-8 border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white text-zinc-800"
                                autoFocus
                              />
                              <button
                                onClick={() => handleInlineUpdate(product, editingValue)}
                                className="p-1 text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-md transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => startEditing(uniqueId, product.stock_quantity)}
                              className="group/cell flex items-center justify-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-zinc-50 transition-colors w-fit mx-auto"
                            >
                              {updatingId === uniqueId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                              ) : (
                                <span className={cn(
                                  "text-sm font-bold tracking-tight",
                                  product.stock_quantity <= (product.threshold || 5) ? "text-amber-500 animate-pulse" : "text-zinc-700",
                                  product.stock_quantity === 0 && "text-red-600"
                                )}>
                                  {product.stock_quantity}
                                </span>
                              )}
                              <Pencil className="w-3 h-3 text-zinc-300 opacity-0 group-hover/cell:opacity-100 transition-opacity ml-1" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border", status.color)}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right pr-8">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStock(product.id, product.variant_id, product.stock_quantity - 1, product.stock_quantity)}
                              className="w-8 h-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:text-red-600 hover:bg-zinc-50 transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUpdateStock(product.id, product.variant_id, product.stock_quantity + 1, product.stock_quantity)}
                              className="w-8 h-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:text-teal-600 hover:bg-zinc-50 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredProducts.length === 0 && !loading && (
                <div className="p-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
                  <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-100">
                    <Package className="w-8 h-8 text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800">No Stock Records</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs">No products matched your specified filtration parameters.</p>
                  </div>
                </div>
              )}
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              variantColor="emerald"
            />
          </Card>
        </TabsContent>

        {/* Tab 2: Functional Stock Level Distribution Graph */}
        <TabsContent value="distribution" className="outline-none">
          <Card className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-16">
              <div className="relative w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={distributionDataset}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {distributionDataset.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e4e4e7",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)"
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-3xl font-black tracking-tight text-zinc-800 leading-none">
                    {products.length}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1.5">
                    Total SKUs
                  </span>
                </div>
              </div>

              {/* Details Legend Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 w-full max-w-2xl">
                {distributionDataset.map((item, idx) => {
                  const percentage = products.length ? Math.round((item.count / products.length) * 100) : 0;
                  return (
                    <div key={idx} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/20 hover:bg-zinc-50/50 transition-colors flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-zinc-100 text-zinc-400">
                          {percentage}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-bold tracking-tight text-zinc-800">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Stock Movement History */}
        <TabsContent value="history" className="space-y-4 outline-none">
          <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 items-center bg-zinc-50/30">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search transactions by product name..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all placeholder:text-zinc-400 text-[#18181b]"
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all duration-150 animate-in fade-in zoom-in-75"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-zinc-50/70 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-8">Date & Time</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Qty Change</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Stock Levels</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Reason / Notes</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pr-8">Adjusted By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                        <p className="text-xs text-zinc-400 mt-2">Retrieving stock movement records...</p>
                      </td>
                    </tr>
                  ) : transactions.map((tx) => {
                    const isPositive = tx.quantity > 0;
                    const qtyText = isPositive ? `+${tx.quantity}` : `${tx.quantity}`;
                    const qtyColor = isPositive ? "text-teal-600 font-bold" : "text-rose-600 font-bold";

                    // Map transaction type styles
                    const typeStyles: Record<string, { label: string; color: string; dot: string }> = {
                      SALE: { label: "Sale", color: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-600" },
                      PURCHASE: { label: "Purchase", color: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-600" },
                      RETURN: { label: "Return", color: "bg-purple-50 text-purple-700 border-purple-100", dot: "bg-purple-600" },
                      REFUND: { label: "Refund", color: "bg-pink-50 text-pink-700 border-pink-100", dot: "bg-pink-600" },
                      RESERVATION: { label: "Reserved", color: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
                      RELEASE: { label: "Released", color: "bg-zinc-100 text-zinc-650 border-zinc-200", dot: "bg-zinc-400" },
                      ADJUSTMENT: { label: "Adjustment", color: "bg-indigo-50 text-indigo-700 border-indigo-100", dot: "bg-indigo-600" },
                    };

                    const style = typeStyles[tx.type] || { label: tx.type, color: "bg-zinc-50 text-zinc-600 border-zinc-100", dot: "bg-zinc-400" };

                    return (
                      <tr key={tx.id} className="hover:bg-zinc-50/50 even:bg-zinc-50/20 transition-all duration-200">
                        <td className="px-6 py-4 pl-8">
                          <span className="text-xs text-zinc-500 block">
                            {new Date(tx.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="text-sm font-medium text-zinc-700 block">
                              {tx.products?.name || "Unknown Product"}
                            </span>
                            {tx.product_variants?.name && (
                              <span className="text-[11px] text-zinc-400 font-mono">
                                Variant: {tx.product_variants.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border", style.color)}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                            {style.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("text-sm tracking-tight", qtyColor)}>
                            {qtyText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-medium text-zinc-600">
                            {tx.before_stock} → {tx.after_stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate">
                          <span className="text-xs text-zinc-600" title={tx.notes}>
                            {tx.notes || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 pr-8">
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-zinc-700 block">
                              {tx.creator?.full_name || "System"}
                            </span>
                            {tx.creator?.email && (
                              <span className="text-[10px] text-zinc-400 block truncate max-w-[120px]">
                                {tx.creator.email}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {transactions.length === 0 && !historyLoading && (
                <div className="p-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
                  <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-100">
                    <Activity className="w-8 h-8 text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800">No Transactions Found</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs">No stock movement logs recorded yet.</p>
                  </div>
                </div>
              )}
            </div>

            <Pagination
              currentPage={historyPage}
              totalItems={historyTotal}
              pageSize={historyPageSize}
              onPageChange={setHistoryPage}
              onPageSizeChange={setHistoryPageSize}
              variantColor="emerald"
            />
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}