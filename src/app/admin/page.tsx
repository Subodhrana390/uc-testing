"use client";

import { useEffect, useState, useMemo } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  Package,
  ArrowUpRight,
  IndianRupee,
  CalendarDays,
  Loader2,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getDisplayOrderId } from "@/lib/order";

// Static imports from Recharts (rendered only after mounting to avoid SSR hydration mismatches)
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

const getStatusBadge = (status: string) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "PENDING":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
    case "CONFIRMED":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">Confirmed</span>;
    case "PROCESSING":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">Processing</span>;
    case "SHIPPED":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">Shipped</span>;
    case "DELIVERED":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Delivered</span>;
    case "CANCELLED":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">Cancelled</span>;
    case "RETURNED":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Returned</span>;
    case "FAILED":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">Failed</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-700 border border-zinc-200">{status || "Placed"}</span>;
  }
};

const getPaymentStatusBadge = (paymentStatus: string) => {
  const s = paymentStatus || "Unpaid";
  switch (s) {
    case "Paid":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-250">Paid</span>;
    case "Refund Pending":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-250 animate-pulse">Refund Pending</span>;
    case "Refunded":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-250">Refunded</span>;
    case "Cancelled":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-500 border border-zinc-200">Cancelled</span>;
    case "Failed":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">Failed</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-250">{s}</span>;
  }
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeUsers: 0,
    totalSales: 0,
    activeProducts: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [chartMode, setChartMode] = useState<"revenue" | "orders" | "profit">("revenue");

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setIsMounted(true);

    async function fetchDashboardData() {
      try {
        const { count: productCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount, customer_name, created_at, id, status, payment_status")
          .order("created_at", { ascending: false });

        const { count: customerCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "customer");

        const revenue = orders?.reduce((acc: number, order: any) => acc + parseFloat(order.total_amount), 0) || 0;

        setStats({
          totalRevenue: revenue,
          activeUsers: customerCount || 0,
          totalSales: orders?.length || 0,
          activeProducts: productCount || 0,
        });

        if (orders) {
          setRecentOrders(orders.slice(0, 5));

          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
          }).reverse();

          const trendData = last7Days.map((date, idx) => {
            const dayOrders = orders.filter((o: any) => o.created_at.startsWith(date));
            const dayRevenue = dayOrders.reduce((acc: number, o: any) => acc + parseFloat(o.total_amount), 0);
            return {
              name: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
              revenue: dayRevenue,
              orders: dayOrders.length,
              profit: dayRevenue * 0.4, // simulated 40% margin
              users: Math.max(1, dayOrders.length * 2 + (idx % 3)),
              products: Math.max(12, (productCount || 0) - (6 - idx)),
            };
          });
          setChartData(trendData);
        }
      } catch (error) {
        console.error("Dashboard Sync Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();

    return () => {};
  }, [supabase]);

  const activeChartConfig = useMemo(() => {
    switch (chartMode) {
      case "revenue":
        return {
          title: "Revenue Overview",
          dataKey: "revenue",
          color: "#10b981",
          gradientId: "revenueGrad",
          formatter: (val: number) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
        };
      case "orders":
        return {
          title: "Orders Overview",
          dataKey: "orders",
          color: "#3b82f6",
          gradientId: "ordersGrad",
          formatter: (val: number) => `${val} orders`
        };
      case "profit":
        return {
          title: "Profit Overview",
          dataKey: "profit",
          color: "#8b5cf6",
          gradientId: "profitGrad",
          formatter: (val: number) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
        };
    }
  }, [chartMode]);

  const metricCards = [
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      trend: "+12.5%",
      isPositive: true,
      icon: <IndianRupee className="w-5 h-5" />,
      iconBgColor: "bg-emerald-50",
      iconColor: "text-emerald-500",
      dataKey: "revenue",
      chartColor: "#10b981"
    },
    {
      title: "Customer Base",
      value: stats.activeUsers.toLocaleString('en-IN'),
      trend: "+8.2%",
      isPositive: true,
      icon: <Users className="w-5 h-5" />,
      iconBgColor: "bg-cyan-50",
      iconColor: "text-cyan-500",
      dataKey: "users",
      chartColor: "#06b6d4"
    },
    {
      title: "Orders Processed",
      value: stats.totalSales.toLocaleString('en-IN'),
      trend: "-3.1%",
      isPositive: false,
      icon: <ShoppingBag className="w-5 h-5" />,
      iconBgColor: "bg-blue-50",
      iconColor: "text-blue-500",
      dataKey: "orders",
      chartColor: "#3b82f6"
    },
    {
      title: "Active Products",
      value: stats.activeProducts.toLocaleString('en-IN'),
      trend: "+24.7%",
      isPositive: true,
      icon: <Eye className="w-5 h-5" />,
      iconBgColor: "bg-amber-50",
      iconColor: "text-amber-500",
      dataKey: "products",
      chartColor: "#f59e0b"
    }
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
      <div className="w-16 h-16 border-4 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest animate-pulse">Loading Store Insights...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto w-full px-2 lg:px-4">
      {/* Flux-style Hero Banner Container */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-20 -mb-20 blur-2xl pointer-events-none" />

        {/* Dashboard Title Header inside banner */}
        <div className="mb-8 relative z-10">
          <div className="text-3xl font-extrabold text-white tracking-tight">Good morning, Admin</div>
          <p className="text-sm font-medium text-indigo-100 mt-1">
            Welcome back. Here's what's happening with <span className="font-bold text-white">UC Enterprises</span> today.
          </p>
        </div>

        {/* Metrics Grid inside banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative z-10"
        >
          {metricCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white/10 backdrop-blur-md p-5 pb-0 rounded-2xl border border-white/10 hover:bg-white/15 transition-all duration-300 flex flex-col justify-between shadow-sm group overflow-hidden relative"
            >
              <div className="px-1 pt-1 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">{card.title}</span>
                  <h2 className="text-2xl font-black text-white mt-1 tracking-tight">{card.value}</h2>

                  {/* Trend indicator */}
                  <div className="flex items-center gap-1 mt-2">
                    <span className="flex items-center gap-0.5 text-[11px] font-bold bg-white/20 px-1.5 py-0.5 rounded-lg text-white">
                      {card.isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {card.trend}
                    </span>
                    <span className="text-[11px] font-semibold text-white/60">vs last month</span>
                  </div>
                </div>

                {/* Icon circle */}
                <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105 bg-white/15 text-white">
                  {card.icon}
                </div>
              </div>

              {/* Sparkline wave line chart at bottom (clean white color) */}
              <div className="w-full h-12 mt-4 -mx-5 px-5 select-none pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
                {isMounted && chartData.length > 0 && (
                  <ResponsiveContainer width="112%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={`grad-white-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey={card.dataKey}
                        stroke="#ffffff"
                        strokeWidth={2}
                        fill={`url(#grad-white-${idx})`}
                        dot={false}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Financial Performance Area Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Overview</h3>
              <p className="text-xs font-semibold text-zinc-400 mt-1">Monthly performance for the current year</p>
            </div>

            {/* Premium segmented control pills */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-fit self-start sm:self-auto border border-zinc-200">
              <button
                onClick={() => setChartMode("revenue")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  chartMode === "revenue"
                    ? "bg-white text-[#18181b] shadow-sm border border-[#10b981]"
                    : "text-zinc-500 hover:text-[#18181b]"
                )}
              >
                Revenue
              </button>
              <button
                onClick={() => setChartMode("orders")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  chartMode === "orders"
                    ? "bg-white text-[#18181b] shadow-sm border border-[#3b82f6]"
                    : "text-zinc-500 hover:text-[#18181b]"
                )}
              >
                Orders
              </button>
              <button
                onClick={() => setChartMode("profit")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  chartMode === "profit"
                    ? "bg-white text-[#18181b] shadow-sm border border-[#8b5cf6]"
                    : "text-zinc-500 hover:text-[#18181b]"
                )}
              >
                Profit
              </button>
            </div>
          </div>

          <div className="h-[340px] w-full -ml-4">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id={activeChartConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeChartConfig.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={activeChartConfig.color} stopOpacity={0} />
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
                    tickFormatter={activeChartConfig.formatter}
                  />
                  <Tooltip
                    cursor={{ stroke: activeChartConfig.color, strokeWidth: 1.5, strokeDasharray: '4 4' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div 
                            className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl text-xs font-bold animate-in fade-in duration-200"
                            style={{ border: `1px solid ${activeChartConfig.color}` }}
                          >
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                              {payload[0].payload.name}
                            </p>
                            <p className="text-sm font-black">
                              {chartMode === "orders" 
                                ? `${payload[0].value} orders` 
                                : `₹${payload[0].value?.toLocaleString('en-IN')}`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeChartConfig.dataKey}
                    stroke={activeChartConfig.color}
                    strokeWidth={3}
                    fill={`url(#${activeChartConfig.gradientId})`}
                    strokeLinecap="round"
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-300">
                <Loader2 className="w-8 h-8 animate-spin text-[#06b6d4]" />
                <p className="text-[10px] font-black uppercase tracking-widest">Aggregating Financial Data...</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Volume Bar Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Order Volume</h3>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Daily order frequency</p>
          </div>

          <div className="h-[340px] w-full mt-6 -ml-4">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
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
                              {payload[0].payload.name}
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
                    fill="url(#barGrad)"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-300">
                <Loader2 className="w-8 h-8 animate-spin text-[#3b82f6]" />
                <p className="text-[10px] font-black uppercase tracking-widest">Loading orders...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recent Orders Table (Takes 8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Recent Orders</h3>
              <p className="text-xs font-semibold text-zinc-400 mt-1">Latest transactions from your store</p>
            </div>
            <button
              onClick={() => window.location.href = '/admin/orders'}
              className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1 transition-all"
            >
              View all &rarr;
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-zinc-200 pb-3">
                  <th className="pb-3 text-xs font-bold text-zinc-400 uppercase tracking-wider text-left">Customer</th>
                  <th className="pb-3 text-xs font-bold text-zinc-400 uppercase tracking-wider text-left">Order ID</th>
                  <th className="pb-3 text-xs font-bold text-zinc-400 uppercase tracking-wider text-left">Date</th>
                  <th className="pb-3 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Status</th>
                  <th className="pb-3 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Payment</th>
                  <th className="pb-3 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-xs text-[#18181b] uppercase shadow-inner">
                        {order.customer_name?.charAt(0) || "U"}
                      </div>
                      <span className="text-sm font-semibold text-[#18181b]">{order.customer_name || "Guest Customer"}</span>
                    </td>
                    <td className="py-3.5 text-xs font-mono font-bold text-zinc-400">
                      {getDisplayOrderId(order.id, order.created_at)}
                    </td>
                    <td className="py-3.5 text-xs text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-3.5 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 text-center">
                      {getPaymentStatusBadge(order.payment_status)}
                    </td>
                    <td className="py-3.5 text-sm font-bold text-[#18181b] text-right">
                      ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pro Insights (Takes 4 cols) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 hover:border-[#06b6d4]/50 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[360px] transition-colors duration-300">
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#06b6d4]/10 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />

          <div>
            <h4 className="text-[10px] font-bold text-[#06b6d4] uppercase tracking-widest">Pro Insights</h4>
            <h3 className="text-lg font-bold !text-white mt-1 tracking-tight">Store Intelligence</h3>

            <div className="space-y-6 mt-8">
              <div>
                <p className="text-3xl font-extrabold tracking-tight !text-white">
                  ₹{(stats.totalRevenue / (stats.totalSales || 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] font-bold !text-slate-400 uppercase tracking-wider mt-1">Average Order Value</p>
              </div>
              <div className="h-px bg-slate-800/60" />
              <div>
                <p className="text-3xl font-extrabold tracking-tight !text-white">
                  {(stats.totalSales / (stats.activeUsers || 1)).toFixed(1)}x
                </p>
                <p className="text-[11px] font-bold !text-slate-400 uppercase tracking-wider mt-1">Purchase Frequency</p>
              </div>
            </div>
          </div>

          <button className="w-full mt-8 py-3 bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 border border-[#06b6d4]/20 hover:border-[#06b6d4]/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-[#06b6d4]">
            Download Full Analysis
          </button>
        </div>
      </div>

    </div>
  );
}