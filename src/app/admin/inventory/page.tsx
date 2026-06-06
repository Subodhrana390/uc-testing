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
  BarChart,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart
} from "recharts";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("ledger");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<number>(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity, category_id, created_at, categories(name)")
        .order("stock_quantity", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
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

  const updateStock = async (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", id);

      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock_quantity: newQuantity } : p));
      toast.success("Stock level updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update stock");
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditing = (id: string, currentQty: number) => {
    setEditingId(id);
    setEditingValue(currentQty);
  };

  const handleInlineUpdate = async (id: string, newQuantity: number) => {
    setEditingId(null);
    await updateStock(id, newQuantity);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Depleted", value: "depleted", color: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-600" };
    if (quantity < 10) return { label: "Critical", value: "critical", color: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500 animate-pulse" };
    return { label: "Stable", value: "stable", color: "bg-teal-50 text-teal-700 border-teal-100", dot: "bg-teal-600" };
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const statusObj = getStockStatus(p.stock_quantity);
      const matchesFilter = statusFilter === "all" || statusObj.value === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [products, searchQuery, statusFilter]);

  // Chart Analytics Dataset 1: Structural Categorization Breakdown
  const distributionDataset = useMemo(() => {
    let depleted = 0;
    let critical = 0;
    let stable = 0;

    products.forEach(p => {
      if (p.stock_quantity === 0) depleted++;
      else if (p.stock_quantity < 10) critical++;
      else stable++;
    });

    return [
      { name: "Stable Stock", count: stable, fill: "#0d9488" },
      { name: "Critical Alert", count: critical, fill: "#f59e0b" },
      { name: "Depleted Out", count: depleted, fill: "#ef4444" }
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

  // Data Pipeline Engine: CSV Generation
  const exportToCSV = () => {
    if (!filteredProducts.length) return toast.error("No dataset available to export");

    const headers = ["Product ID,Product Name,Category,Stock Volume,Status\n"];
    const rows = filteredProducts.map(p =>
      `"${p.id}","${p.name.replace(/"/g, '""')}","${p.categories?.name || "Uncategorized"}",${p.stock_quantity},"${getStockStatus(p.stock_quantity).label}"`
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

  // Data Pipeline Engine: PDF Generation
  const exportToPDF = async () => {
    if (!filteredProducts.length) return toast.error("No dataset available to export");

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.text("UC ENTERPRISES - INVENTORY MANAGEMENT MANIFEST", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = filteredProducts.map(p => [
      p.id.toUpperCase().slice(0, 8),
      p.name,
      p.categories?.name || "Uncategorized",
      p.stock_quantity,
      getStockStatus(p.stock_quantity).label
    ]);

    autoTable(doc, {
      head: [["SKU ID", "Product Identity Label", "Category context", "Volume", "Status Check"]],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [24, 24, 27] }
    });

    doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF report generated");
  };

  if (loading) return <LogoLoader text="Loading physical inventory ledger..." />;

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Top Controls Bar */}
      {/* Emerald Gradient Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Stock Inventory</h1>
            <p className="text-sm font-medium text-emerald-50 mt-1">Monitor and update your product availability logs in real-time</p>
          </div>
        </div>

        {/* Analytics Summary Core Matrix */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Total SKUs</span>
              <Package className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">{products.length}</div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Catalog positions</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Stable Stock</span>
              <Check className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {products.filter(p => p.stock_quantity >= 10).length}
              </div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Sufficient inventory</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Critical Low</span>
              <AlertTriangle className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {products.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10).length}
              </div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Approaching thresholds</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-emerald-105 uppercase tracking-wider">Depleted</span>
              <TrendingDown className="w-4 h-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {products.filter(p => p.stock_quantity === 0).length}
              </div>
              <p className="text-[11px] text-emerald-100/60 mt-1">Out of stock</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Stock Health Composition Chart */}
      <Card className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-50 pb-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-zinc-800 tracking-tight">Stock Health Composition</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Real-time status metrics and catalog health summary</p>
          </div>
          <div className="text-xs font-semibold text-zinc-400 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100 mt-2 sm:mt-0">
            Total Ledger: <span className="font-bold text-zinc-700">{products.length} SKUs</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-16">
          {/* Donut Chart Container */}
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
            {/* Centered SKU counter inside donut hole */}
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
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                      {item.name === "Stable Stock" && "Products with sufficient inventory levels"}
                      {item.name === "Critical Alert" && "Products approaching critical thresholds"}
                      {item.name === "Depleted Out" && "Products currently out of stock"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

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
            <TabsTrigger value="trends" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm gap-1.5 flex items-center">
              <LineIcon className="w-3.5 h-3.5 text-zinc-500" /> Ingestion Trends
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activeTab === "ledger" && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <Button onClick={exportToCSV} variant="outline" className="h-10 px-4 border-zinc-200 rounded-xl gap-2 text-zinc-600 text-sm font-medium shadow-sm hover:bg-zinc-50 transition-colors">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
                </Button>
                <Button onClick={exportToPDF} variant="outline" className="h-10 px-4 border-zinc-200 rounded-xl gap-2 text-zinc-600 text-sm font-medium shadow-sm hover:bg-zinc-50 transition-colors">
                  <FileText className="w-4 h-4 text-red-500" /> Export PDF
                </Button>
              </div>
            )}
            <Button onClick={fetchInventory} variant="outline" className="h-10 w-10 p-0 border-zinc-200 rounded-xl text-zinc-600 shadow-sm hover:bg-zinc-50 transition-colors">
              <RefreshCw className="w-4 h-4" />
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
                  placeholder="Search stock by product name or ID..."
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
                    <SelectItem value="stable" className="text-xs text-teal-600 font-medium">Stable Levels</SelectItem>
                    <SelectItem value="critical" className="text-xs text-amber-600 font-medium">Critical Thresholds</SelectItem>
                    <SelectItem value="depleted" className="text-xs text-red-600 font-medium">Depleted Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-zinc-50/70 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-8">Product Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Current Stock</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stock Level</th>
                    <th className="w-32 pr-8 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product.stock_quantity);
                    return (
                      <tr key={product.id} className="hover:bg-zinc-50/50 even:bg-zinc-50/20 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm group">
                        <td className="px-6 py-4 pl-8">
                          <div className="space-y-0.5">
                            <span className="text-sm font-medium text-zinc-700 block">{product.name}</span>
                            <span className="text-[11px] text-zinc-400 font-mono">SKU: {product.id.toUpperCase().slice(0, 12)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-lg inline-block">
                            {product.categories?.name || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {editingId === product.id ? (
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
                                    handleInlineUpdate(product.id, editingValue);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                className="w-16 text-center h-8 border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white text-zinc-800"
                                autoFocus
                              />
                              <button
                                onClick={() => handleInlineUpdate(product.id, editingValue)}
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
                              onClick={() => startEditing(product.id, product.stock_quantity)}
                              className="group/cell flex items-center justify-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-zinc-50 transition-colors w-fit mx-auto"
                            >
                              {updatingId === product.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                              ) : (
                                <span className={cn(
                                  "text-sm font-bold tracking-tight",
                                  product.stock_quantity < 10 ? "text-amber-500 animate-pulse" : "text-zinc-700"
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
                              onClick={() => updateStock(product.id, product.stock_quantity - 1)}
                              className="w-8 h-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:text-red-600 hover:bg-zinc-50 transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => updateStock(product.id, product.stock_quantity + 1)}
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

              {filteredProducts.length === 0 && (
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
          </Card>
        </TabsContent>

        {/* Tab 2: Functional Stock Level Distribution Graph */}
        <TabsContent value="distribution" className="outline-none">
          <Card className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-base font-bold text-zinc-800 tracking-tight">Stock State Prevalence</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Categorical summary showing the distribution of physical inventory health metrics</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={distributionDataset} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="distAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Area type="monotone" dataKey="count" name="Product Count" stroke="#0d9488" fill="url(#distAreaFill)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Historical Inventory Growth Trends Chart */}
        <TabsContent value="trends" className="outline-none">
          <Card className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-base font-bold text-zinc-800 tracking-tight">Inflow Volume & SKU Evolution</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Visual representation tracking active item velocities alongside storage footprints across chronological milestones</p>
            </div>

            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendDataset} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />

                  {/* Total Volume Curvature Area */}
                  <Area type="monotone" name="Total Product Units Stocked" dataKey="StockVolume" fill="url(#trendAreaFill)" stroke="#0d9488" strokeWidth={2} />
                  {/* Distinct Core SKU Growth Pillars */}
                  <Bar dataKey="SKUCount" name="Unique SKUs Managed" barSize={14} fill="#18181b" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}