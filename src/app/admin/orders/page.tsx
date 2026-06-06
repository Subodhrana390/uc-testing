"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Search,
  MoreHorizontal,
  Eye,
  Truck,
  CheckCircle2,
  Filter,
  Clock,
  Download,
  Package,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import { getDisplayOrderId } from "@/lib/order";

// Recharts imports
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

// shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusType = "All" | "Pending" | "Shipped" | "Delivered" | "Cancelled";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Form states
  const [trackingId, setTrackingId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType>("All");
  const [carriers, setCarriers] = useState<any[]>([]);

  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          items:order_items (
            *,
            products (name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchCarriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_carriers")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error("Error fetching carriers:", error);
    }
  }, [supabase]);

  useEffect(() => {
    setIsMounted(true);
    fetchOrders();
    fetchCarriers();
  }, [fetchOrders, fetchCarriers]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, status })
      });

      if (!response.ok) throw new Error("Update failed");

      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast.success(`Order marked as ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateTracking = async (id: string) => {
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, status: "Shipped", trackingId, carrier })
      });

      if (!response.ok) throw new Error("Tracking update failed");

      setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking_id: trackingId, carrier, status: "Shipped" } : o));
      toast.success("Logistics updated");
      setIsTrackingOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(10);
    doc.text("Order Report", 14, 15);
    autoTable(doc, {
      head: [['ID', 'Customer', 'Date', 'Total', 'Status']],
      body: orders.map(o => [getDisplayOrderId(o.id, o.created_at), o.customer_name, new Date(o.created_at).toLocaleDateString(), o.total_amount, o.status]),
      startY: 20,
      styles: { fontSize: 8 }
    });
    doc.save("orders_report.pdf");
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Pending</Badge>;
      case "shipped":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">Shipped</Badge>;
      case "delivered":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Delivered</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch =
        (o.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.id && o.created_at && getDisplayOrderId(o.id, o.created_at).toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus =
        statusFilter === "All" || (o.status && o.status.toLowerCase() === statusFilter.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status.toLowerCase() === "pending").length;
    const shipped = orders.filter(o => o.status.toLowerCase() === "shipped").length;
    const delivered = orders.filter(o => o.status.toLowerCase() === "delivered").length;
    return { total, pending, shipped, delivered };
  }, [orders]);

  const dailyOrdersData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map(date => {
      const dayOrders = orders.filter(o => o.created_at?.startsWith(date));
      return {
        date,
        name: new Date(date).toLocaleDateString("en-IN", { weekday: "short" }),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  const statusData = useMemo(() => {
    const pending = orders.filter(o => o.status.toLowerCase() === "pending").length;
    const shipped = orders.filter(o => o.status.toLowerCase() === "shipped").length;
    const delivered = orders.filter(o => o.status.toLowerCase() === "delivered").length;
    const cancelled = orders.filter(o => o.status.toLowerCase() === "cancelled").length;

    return [
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Shipped", value: shipped, color: "#3b82f6" },
      { name: "Delivered", value: delivered, color: "#10b981" },
      { name: "Cancelled", value: cancelled, color: "#ef4444" }
    ];
  }, [orders]);

  const dailyTrends = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map(date => {
      const dayOrders = orders.filter(o => o.created_at?.startsWith(date));
      return {
        date,
        total: dayOrders.length,
        pending: dayOrders.filter(o => o.status.toLowerCase() === "pending").length,
        shipped: dayOrders.filter(o => o.status.toLowerCase() === "shipped").length,
        delivered: dayOrders.filter(o => o.status.toLowerCase() === "delivered").length,
      };
    });
  }, [orders]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name[0].toUpperCase();
  };

  const getAvatarBg = (name: string) => {
    const colors = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-cyan-100 text-cyan-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-purple-100 text-purple-700"];
    return colors[(name.charCodeAt(0) || 0) % colors.length];
  };

  if (loading) return <LogoLoader text="Loading orders..." />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Blue Gradient Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Header System */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Order Management</h1>
            <p className="text-sm font-medium text-sky-100 mt-1">
              Manage logistics, track delivery status, and view customer purchase reports.
            </p>
          </div>
          <Button onClick={exportToPDF} className="gap-2 shadow-sm bg-white/20 hover:bg-white/30 text-white font-bold border border-white/10">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 relative z-10">
          {/* Total Orders Card */}
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <CardTitle className="text-sm font-medium text-white/85">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.total}</div>
                <div className="text-[10px] text-sky-100/60 font-semibold mt-1">Last 7 days trend</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="total" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-total)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Pending Card */}
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <CardTitle className="text-sm font-medium text-white/85">Pending</CardTitle>
                <Clock className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.pending}</div>
                <div className="text-[10px] text-sky-100/60 font-semibold mt-1">Last 7 days trend</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-pending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="pending" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-pending)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Shipped Card */}
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <CardTitle className="text-sm font-medium text-white/85">Shipped</CardTitle>
                <Truck className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.shipped}</div>
                <div className="text-[10px] text-sky-100/60 font-semibold mt-1">Last 7 days trend</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-shipped" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="shipped" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-shipped)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Delivered Card */}
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-4 pb-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                <CardTitle className="text-sm font-medium text-white/85">Delivered</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black text-white">{stats.delivered}</div>
                <div className="text-[10px] text-sky-100/60 font-semibold mt-1">Last 7 days trend</div>
              </CardContent>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-delivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="delivered" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-delivered)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>


      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Status Distribution Donut Chart */}
        <Card className="bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Order Status Distribution</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Percentage and count of orders by status</p>
          </div>
          <div className="h-[260px] w-full mt-4 flex items-center justify-center relative">
            {isMounted && orders.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percentage = ((data.value / (stats.total || 1)) * 100).toFixed(1);
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {data.name}
                            </p>
                            <p className="text-sm font-black">
                              {data.value} orders ({percentage}%)
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
                <p className="text-[10px] font-black uppercase tracking-widest">No order status data available</p>
              </div>
            )}
            
            {/* Center Text inside Donut Hole */}
            {isMounted && orders.length > 0 && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#18181b]">{stats.total}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Orders</span>
              </div>
            )}
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            {[
              { label: "Pending", color: "#f59e0b" },
              { label: "Shipped", color: "#3b82f6" },
              { label: "Delivered", color: "#10b981" },
              { label: "Cancelled", color: "#ef4444" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Daily Order Volume Bar Chart */}
        <Card className="bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Daily Order Volume</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Daily order frequency (7 days)</p>
          </div>
          <div className="h-[260px] w-full mt-4 -ml-4">
            {isMounted && orders.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyOrdersData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orderBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-[#3b82f6] text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {payload[0].payload.date}
                            </p>
                            <p className="text-sm font-black">
                              {payload[0].value} orders
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="orders"
                    fill="url(#orderBarGrad)"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <p className="text-[10px] font-black uppercase tracking-widest">No order volume data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Table Area */}
      <Card className="overflow-hidden bg-white shadow-sm border border-zinc-200 text-[#18181b]">

        {/* Top Controls: Search & Filters */}
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by Order ID or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 bg-zinc-50 border-zinc-200 focus-visible:ring-[#3b82f6] text-[#18181b]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all duration-150 animate-in fade-in zoom-in-75"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center w-full sm:w-auto gap-3">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter((val as StatusType) || "All")}>
              <SelectTrigger className="w-full sm:w-[160px] bg-zinc-50 border-zinc-200 focus:ring-[#3b82f6] text-[#18181b] relative">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Status" />
                </div>
                {statusFilter !== "All" && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200">
                <SelectItem value="All">All Orders</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Shipped">Shipped</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Orders Table */}
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-zinc-200">
              <TableRow>
                <TableHead className="w-[120px] text-zinc-500 font-bold">Order ID</TableHead>
                <TableHead className="text-zinc-500 font-bold">Customer</TableHead>
                <TableHead className="text-zinc-500 font-bold">Date</TableHead>
                <TableHead className="text-zinc-500 font-bold">Total Amount</TableHead>
                <TableHead className="text-zinc-500 font-bold">Status</TableHead>
                <TableHead className="text-right pr-6 text-zinc-500 font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100">
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100 shadow-inner">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-zinc-800 mt-2">No results found</p>
                      <p className="text-xs text-zinc-400 max-w-[240px]">We couldn't find any orders matching "{searchQuery}" or status "{statusFilter}".</p>
                      {(searchQuery || statusFilter !== "All") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("All");
                          }}
                          className="mt-2 text-xs border-zinc-200 hover:bg-zinc-50"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-zinc-50 even:bg-zinc-50/30 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm">
                    <TableCell className="font-mono text-xs font-bold text-zinc-500">
                      {getDisplayOrderId(order.id, order.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full border border-white/50 flex items-center justify-center text-xs font-bold shadow-sm", getAvatarBg(order.customer_name))}>
                          {getInitials(order.customer_name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#18181b]">{order.customer_name}</span>
                          <span className="text-xs text-zinc-500">{order.customer_email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      {new Date(order.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-[#18181b]">
                      ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => updateStatus(order.id, "Delivered")}>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                              Mark Delivered
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order);
                              setTrackingId(order.tracking_id || "");
                              setCarrier(order.carrier || "");
                              setTimeout(() => setIsTrackingOpen(true), 50);
                            }}>
                              <Truck className="w-4 h-4 mr-2 text-blue-600" />
                              Update Shipping
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order);
                              setTimeout(() => setIsDetailsOpen(true), 50);
                            }}>
                              <Eye className="w-4 h-4 mr-2 text-zinc-600" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Tracking Dialog */}
      <Dialog open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border border-zinc-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-bold">Shipment Logistics</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Assign carrier information for Order {selectedOrder ? getDisplayOrderId(selectedOrder.id, selectedOrder.created_at) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-zinc-900">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700">Courier Carrier</label>
              <Select value={carrier} onValueChange={(val) => setCarrier(val || "")}>
                <SelectTrigger className="w-full bg-white border-zinc-200 focus:ring-[#3b82f6] text-[#18181b]">
                  <SelectValue placeholder="Select Carrier Partner" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200">
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {carriers.length === 0 && (
                    <SelectItem value="none" disabled>
                      No active carriers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700">Tracking ID</label>
              <Input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking barcode number"
                className="bg-white border-zinc-200 focus-visible:ring-[#3b82f6] text-[#18181b]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrackingOpen(false)} className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl">Cancel</Button>
            <Button onClick={() => updateTracking(selectedOrder?.id)} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold border-0 rounded-xl">Update Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 bg-white border border-zinc-200 shadow-xl rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-150">
            <DialogTitle className="text-zinc-900 font-bold">Order Details</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Invoice #{selectedOrder ? getDisplayOrderId(selectedOrder.id, selectedOrder.created_at) : ""}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {selectedOrder && (
              <div className="p-6 space-y-6 text-[#18181b]">
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-900">Customer Information</h4>
                    <p className="text-zinc-600">{selectedOrder.customer_name}</p>
                    <p className="text-zinc-500 text-xs">{selectedOrder.customer_email}</p>
                    <p className="text-zinc-500 text-xs">{selectedOrder.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-900">Shipping Address</h4>
                    <p className="text-zinc-600 text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedOrder.shipping_address || "No shipping record details"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-zinc-900">Purchased Items</h4>
                  <div className="rounded-xl border border-zinc-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-50">
                        <TableRow className="border-b border-zinc-200">
                          <TableHead className="font-bold text-zinc-600">Product Name</TableHead>
                          <TableHead className="text-center w-16 font-bold text-zinc-600">Qty</TableHead>
                          <TableHead className="text-right font-bold text-zinc-600">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-zinc-100">
                        {selectedOrder.items?.map((item: any, i: number) => (
                          <TableRow key={i} className="hover:bg-zinc-50 border-b border-zinc-100">
                            <TableCell className="font-medium text-[#18181b]">{item.products?.name}</TableCell>
                            <TableCell className="text-center text-zinc-600">x{item.quantity}</TableCell>
                            <TableCell className="text-right font-bold text-[#18181b]">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {(selectedOrder.tracking_id || selectedOrder.delivery_estimate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrder.delivery_estimate && (
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-zinc-505">Expected Arrival</span>
                        <span className="text-sm font-bold text-[#18181b]">{selectedOrder.delivery_estimate}</span>
                      </div>
                    )}
                    {selectedOrder.tracking_id && (
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-zinc-505">{selectedOrder.carrier}</span>
                        <span className="text-sm font-bold font-mono text-[#18181b]">{selectedOrder.tracking_id}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between mt-auto">
            <span className="text-sm font-bold text-zinc-600">Total Invoice Amount</span>
            <span className="text-xl font-extrabold text-[#18181b]">
              ₹{selectedOrder ? parseFloat(selectedOrder.total_amount).toLocaleString('en-IN') : 0}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}