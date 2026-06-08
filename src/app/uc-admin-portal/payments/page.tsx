"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  CreditCard,
  MoreHorizontal,
  Eye,
  Truck,
  ArrowDownRight,
  TrendingUp,
  Receipt,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

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

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
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

type StatusType = "All" | "Completed" | "Pending" | "Failed" | "Refunded";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Modals & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType>("All");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [carrier, setCarrier] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const fetchPayments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*, orders(id, created_at, customer_name, customer_email, shipping_address, phone, delivery_estimate)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    setIsMounted(true);
    fetchPayments();
  }, [fetchPayments]);

  const getDisplayOrderId = (id: string, dateStr: string) => {
    if (!id || !dateStr) return `ORD-${id?.slice(0,8).toUpperCase()}`;
    const date = new Date(dateStr);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `UC-${year}${month}-${id.substring(0, 6).toUpperCase()}`;
  };

  const updateStatus = async (paymentId: string, orderId: string, status: string) => {
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status })
      });
      if (!response.ok) throw new Error("Update failed");
      setPayments(prev => prev.map(o => o.id === paymentId ? { ...o, status } : o));
      toast.success(`Order marked as ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const issueRefund = async (paymentId: string, orderId: string) => {
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentStatus: "Refunded" })
      });
      if (!response.ok) throw new Error("Refund failed");
      
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: "Refunded" } : p));
      toast.success(`Refund issued successfully`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateTracking = async (orderId: string, paymentId: string) => {
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "Shipped", trackingId, carrier })
      });
      if (!response.ok) throw new Error("Tracking update failed");
      setPayments(prev => prev.map(o => o.id === paymentId ? { ...o, tracking_id: trackingId, carrier, status: "Shipped" } : o));
      toast.success("Logistics updated");
      setIsTrackingOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const downloadCSV = () => {
    const headers = ["Payment ID", "Order ID", "Amount", "Method", "Status", "Date"];
    const rows = filteredPayments.map(p => [
      p.id, p.order_id, p.amount, p.payment_method, p.status, new Date(p.created_at).toLocaleDateString()
    ]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch =
        (p.transaction_id || "").toLowerCase().includes(searchStr) ||
        p.order_id.toLowerCase().includes(searchStr) ||
        (p.orders?.customer_email || "").toLowerCase().includes(searchStr) ||
        (p.orders?.customer_name || "").toLowerCase().includes(searchStr);
      const matchesStatus = statusFilter === "All" || p.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const completed = payments.filter(p => p.status.toLowerCase() === "completed");
    return {
      revenue: completed.reduce((acc, curr) => acc + parseFloat(curr.amount), 0),
      successRate: payments.length ? Math.round((completed.length / payments.length) * 100) : 0,
      pending: payments.filter(p => p.status.toLowerCase() === "pending").length,
      failed: payments.filter(p => p.status.toLowerCase() === "failed").length,
    };
  }, [payments]);

  const dailyRevenueData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map(date => {
      const dayPayments = payments.filter(p => p.created_at?.startsWith(date) && p.status.toLowerCase() === "completed");
      return {
        date,
        name: new Date(date).toLocaleDateString("en-IN", { weekday: "short" }),
        amount: dayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
      };
    });
  }, [payments]);

  const paymentStatusData = useMemo(() => {
    const completed = payments.filter(p => p.status.toLowerCase() === "completed").length;
    const pending = payments.filter(p => p.status.toLowerCase() === "pending").length;
    const failed = payments.filter(p => p.status.toLowerCase() === "failed").length;
    const refunded = payments.filter(p => p.status.toLowerCase() === "refunded").length;

    return [
      { name: "Completed", value: completed, color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Failed", value: failed, color: "#ef4444" },
      { name: "Refunded", value: refunded, color: "#8b5cf6" }
    ];
  }, [payments]);

  const dailyTrends = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map(date => {
      const dayPayments = payments.filter(p => p.created_at?.startsWith(date));
      const completed = dayPayments.filter(p => p.status.toLowerCase() === "completed");
      return {
        date,
        revenue: completed.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        volume: dayPayments.length,
        pending: dayPayments.filter(p => p.status.toLowerCase() === "pending").length,
        failed: dayPayments.filter(p => p.status.toLowerCase() === "failed").length,
      };
    });
  }, [payments]);

  const getInitials = (name: string) => name ? (name.split(" ").length >= 2 ? `${name.split(" ")[0][0]}${name.split(" ")[1][0]}`.toUpperCase() : name[0].toUpperCase()) : "U";

  const getAvatarBg = (name: string) => {
    const charCode = (name || "").charCodeAt(0) || 0;
    const colors = [
      "bg-emerald-100 text-emerald-800",
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-rose-100 text-rose-800",
    ];
    return colors[charCode % colors.length];
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-0 hover:bg-emerald-200 shadow-none">Completed</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 border-0 hover:bg-orange-200 shadow-none">Pending</Badge>;
      case "failed":
        return <Badge className="bg-rose-100 text-rose-800 border-0 hover:bg-rose-200 shadow-none">Failed</Badge>;
      case "refunded":
        return <Badge className="bg-slate-100 text-slate-700 border-0 hover:bg-slate-200 shadow-none">Refunded</Badge>;
      default:
        return <Badge variant="secondary" className="shadow-none">{status}</Badge>;
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 bg-transparent">
      <div className="w-8 h-8 border-4 border-zinc-800 border-t-[#f59e0b] rounded-full animate-spin" />
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest animate-pulse">Loading payments...</p>
    </div>
  );

  return (
    <div className="space-y-8 w-full px-4 md:px-8 2xl:px-12 mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 font-sans">

      {/* Amber Gradient Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-600 to-orange-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">
              Payments
            </h1>
            <p className="text-sm font-medium text-amber-100 mt-1">
              Manage transactions, refunds, and financial logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={downloadCSV}
              className="bg-white/20 hover:bg-white/30 text-white font-bold border border-white/10 shadow-sm"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* KPI CARDS - RESTORED GRID & MATCHING IMAGE STYLE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">

          {/* Card 1: Net Revenue */}
          <Card className="border border-white/10 bg-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wide">
                  Net Revenue
                </p>
                <div className="rounded-md bg-white/15 p-1.5">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white">
                ₹{stats.revenue.toLocaleString("en-IN")}
              </h2>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300 mt-1">
                <CheckCircle2 className="h-3 w-3" />
                {stats.successRate}% Success Rate
              </div>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-revenue)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Card 2: Total Volume */}
          <Card className="border border-white/10 bg-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wide">
                  Total Volume
                </p>
                <div className="rounded-md bg-white/15 p-1.5">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white">
                {payments.length}
              </h2>
              <p className="text-[10px] text-white/60 font-semibold mt-1">
                Processed transactions
              </p>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-volume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="volume" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-volume)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Card 3: Pending */}
          <Card className="border border-white/10 bg-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wide">
                  Pending
                </p>
                <div className="rounded-md bg-white/15 p-1.5">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white">
                {stats.pending}
              </h2>
              <p className="text-[10px] text-white/60 font-semibold mt-1">
                Awaiting capture
              </p>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-pending-tx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="pending" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-pending-tx)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Card 4: Failed */}
          <Card className="border border-white/10 bg-white/10 text-white shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wide">
                  Failed
                </p>
                <div className="rounded-md bg-white/15 p-1.5">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white">
                {stats.failed}
              </h2>
              <p className="text-[10px] text-white/60 font-semibold mt-1">
                Declined or aborted
              </p>
            </div>
            <div className="w-full h-8 mt-2 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-failed-tx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="failed" stroke="#ffffff" strokeWidth={1.5} fill="url(#grad-failed-tx)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend Area Chart */}
        <Card className="bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Revenue Trend</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Daily completed payments revenue (7 days)</p>
          </div>
          <div className="h-[260px] w-full mt-4 -ml-4">
            {isMounted && payments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    cursor={{ stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-[#f59e0b] text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {payload[0].payload.date}
                            </p>
                            <p className="text-sm font-black">
                              ₹{payload[0].value.toLocaleString("en-IN")}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    fill="url(#revenueAreaGrad)"
                    strokeLinecap="round"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <p className="text-[10px] font-black uppercase tracking-widest">No revenue trend data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Status Breakdown Donut Chart */}
        <Card className="bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-[#18181b]">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Payment Status</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Transaction status distribution</p>
          </div>
          <div className="h-[260px] w-full mt-4 flex items-center justify-center relative">
            {isMounted && payments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percentage = ((data.value / (payments.length || 1)) * 100).toFixed(1);
                        return (
                          <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs font-bold animate-in fade-in duration-200">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {data.name}
                            </p>
                            <p className="text-sm font-black">
                              {data.value} tx ({percentage}%)
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
                <p className="text-[10px] font-black uppercase tracking-widest">No payment data available</p>
              </div>
            )}

            {/* Center Text inside Donut Hole */}
            {isMounted && payments.length > 0 && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#18181b]">{payments.length}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Tx</span>
              </div>
            )}
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            {[
              { label: "Completed", color: "#10b981" },
              { label: "Pending", color: "#f59e0b" },
              { label: "Failed", color: "#ef4444" },
              { label: "Refunded", color: "#8b5cf6" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden border border-zinc-200 bg-white shadow-sm rounded-2xl text-[#18181b]">

        {/* Action Bar */}
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search tx_id, email, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 bg-zinc-50 border-zinc-200 focus-visible:ring-[#f59e0b] text-[#18181b] placeholder:text-zinc-400"
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
              <SelectTrigger className="w-full sm:w-[160px] bg-zinc-50 border-zinc-200 focus:ring-[#f59e0b] text-[#18181b] relative">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All" />
                </div>
                {statusFilter !== "All" && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                )}
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200">
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="bg-zinc-50 sticky top-0 z-10 border-b border-zinc-200">
              <TableRow className="border-b border-zinc-200 hover:bg-transparent">
                <TableHead className="w-[180px] font-bold text-zinc-500 pl-6 h-12">Transaction Ref</TableHead>
                <TableHead className="w-[180px] font-bold text-zinc-500 h-12">Order ID</TableHead>
                <TableHead className="font-bold text-zinc-500 h-12">Customer</TableHead>
                <TableHead className="font-bold text-zinc-500 h-12">Amount</TableHead>
                <TableHead className="font-bold text-zinc-500 h-12">Status</TableHead>
                <TableHead className="font-bold text-zinc-500 h-12">Date</TableHead>
                <TableHead className="text-right pr-6 font-bold text-zinc-500 h-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100">
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-60 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100 shadow-inner">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-zinc-800 mt-2">No records found</p>
                      <p className="text-xs text-zinc-400 max-w-[240px]">We couldn't find any payments matching "{searchQuery}" or status "{statusFilter}".</p>
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
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-zinc-50 even:bg-zinc-50/30 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm border-zinc-200">

                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-[#18181b]">
                          {payment.transaction_id || payment.id.slice(0, 12).toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {payment.payment_method || "ONLINE"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-[#18181b] font-mono bg-zinc-100 px-2 py-1 rounded-md w-max">
                          {payment.orders?.id ? getDisplayOrderId(payment.orders.id, payment.orders.created_at) : `ORD-${payment.order_id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]" title={payment.order_id}>
                          {payment.order_id}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className={cn("h-8 w-8", getAvatarBg(payment.orders?.customer_name))}>
                          <AvatarFallback className="bg-transparent text-xs font-bold">
                            {getInitials(payment.orders?.customer_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#18181b]">
                            {payment.orders?.customer_name || "Guest Customer"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {payment.orders?.customer_email || "No email provided"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-[#18181b]">
                          ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          {payment.payment_method || "Card"}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>

                    <TableCell className="text-sm text-zinc-500">
                      {new Date(payment.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-[#f59e0b] hover:bg-zinc-100 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-zinc-200 shadow-xl rounded-xl">
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrder(payment);
                            setIsDetailsOpen(true);
                          }} className="cursor-pointer font-semibold text-zinc-700 hover:bg-zinc-50">
                            <Receipt className="w-4 h-4 mr-2 text-zinc-400" /> View Receipt
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-100" />
                          <DropdownMenuItem onClick={() => issueRefund(payment.id, payment.order_id)} className="text-rose-600 focus:text-rose-600 cursor-pointer font-semibold hover:bg-zinc-50">
                            <ArrowDownRight className="w-4 h-4 mr-2" /> Issue Refund
                          </DropdownMenuItem>
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

      {/* --- DIALOGS --- */}

      {/* Tracking Dialog */}
      <Dialog open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border border-zinc-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-bold">Update Logistics</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Assign tracking for Order #{selectedOrder?.order_id?.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-zinc-900">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700">Courier Carrier</label>
              <Input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. Delhivery, BlueDart, Fedex"
                className="bg-white border-zinc-200 focus-visible:ring-[#f59e0b] text-[#18181b]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700">Tracking ID</label>
              <Input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking barcode number"
                className="bg-white border-zinc-200 focus-visible:ring-[#f59e0b] text-[#18181b]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrackingOpen(false)} className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl">Cancel</Button>
            <Button onClick={() => updateTracking(selectedOrder?.order_id, selectedOrder?.id)} className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold border-0 rounded-xl">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt/Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl bg-white">
          <div className="bg-zinc-50 p-6 border-b border-zinc-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-zinc-400 tracking-wider mb-1 uppercase">Payment Receipt</p>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#18181b]">₹{selectedOrder ? parseFloat(selectedOrder.amount).toLocaleString('en-IN') : 0}</h2>
              </div>
              {selectedOrder && getStatusBadge(selectedOrder.status)}
            </div>
          </div>

          <div className="p-6 space-y-6 text-[#18181b]">
            {selectedOrder && (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-bold text-zinc-900 border-b border-zinc-150 pb-2">Customer Profile</p>
                  <div className="text-sm text-zinc-600 space-y-1">
                    <p className="font-bold text-zinc-900">{selectedOrder.orders?.customer_name}</p>
                    <p>{selectedOrder.orders?.customer_email}</p>
                    <p>{selectedOrder.orders?.phone || "No phone provided"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-zinc-900 border-b border-zinc-150 pb-2">Transaction Metadata</p>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    {selectedOrder.orders?.id && (
                      <>
                        <span className="text-zinc-500 font-bold">Order Ref</span>
                        <span className="text-right font-mono text-zinc-900 text-xs font-bold">{getDisplayOrderId(selectedOrder.orders.id, selectedOrder.orders.created_at)}</span>
                      </>
                    )}
                    <span className="text-zinc-500 font-bold">Transaction ID</span>
                    <span className="text-right font-mono text-zinc-900 text-xs font-bold">{selectedOrder.transaction_id || selectedOrder.id}</span>

                    <span className="text-zinc-500 font-bold">Processed On</span>
                    <span className="text-right text-zinc-900 font-bold">{new Date(selectedOrder.created_at).toLocaleString()}</span>

                    <span className="text-zinc-500 font-bold">Gateway / Method</span>
                    <span className="text-right text-zinc-900 uppercase text-xs font-bold">{selectedOrder.payment_method}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="p-4 flex justify-end border-t border-zinc-200 bg-white">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="text-zinc-600 border-zinc-200 rounded-xl hover:bg-zinc-50">Close</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}