"use client";

import { useEffect, useState, useMemo } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  ShieldCheck,
  Ban,
  Filter,
  UserCheck,
  TrendingUp,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// Recharts imports
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchCustomers();
  }, [supabase]);

  const chartData = useMemo(() => {
    if (!customers.length) return [];
    const monthlyCounts: { [key: string]: number } = {};

    [...customers].reverse().forEach((customer) => {
      if (!customer.created_at) return;
      const date = new Date(customer.created_at);
      const monthYear = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
    });

    let runningTotal = 0;
    return Object.keys(monthlyCounts).map((month) => {
      runningTotal += monthlyCounts[month];
      return {
        name: month,
        "Total Customers": runningTotal,
      };
    });
  }, [customers]);

  const monthlySignupsData = useMemo(() => {
    if (!customers.length) return [];
    const monthlyCounts: { [key: string]: number } = {};

    [...customers].reverse().forEach((customer) => {
      if (!customer.created_at) return;
      const date = new Date(customer.created_at);
      const monthYear = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
    });

    return Object.keys(monthlyCounts).map((month) => {
      return {
        name: month,
        "New Signups": monthlyCounts[month],
      };
    });
  }, [customers]);

  const filteredCustomers = customers.filter(c =>
    (c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCustomers = customers.length;
  const activeCustomers = customers.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#14b8a6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full px-4 md:px-8 2xl:px-12 mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Teal Gradient Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Header - Matched font scales and weights to sidebar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Customers</h1>
            <p className="text-sm font-medium text-teal-100 mt-1">Manage and analyze your customer base</p>
          </div>

          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold border border-white/10 rounded-xl text-sm transition-all shadow-sm">
            <Users className="w-4 h-4" />
            Export Data
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
          <div className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-sm text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Total Customers</p>
                <p className="text-3xl font-black tracking-tight text-white mt-2">{totalCustomers}</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/10">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-sm text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Active Customers</p>
                <p className="text-3xl font-black tracking-tight text-white mt-2">{activeCustomers}</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/10">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-sm text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">This Month</p>
                <p className="text-3xl font-black tracking-tight text-white mt-2">+{Math.floor(totalCustomers * 0.18)}</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/10">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Customer Growth Trend Section */}
      {chartData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Customer Growth Area Chart */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm text-[#18181b] flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#18181b] tracking-tight">Growth Analytics</h2>
              <p className="text-xs text-zinc-500">Visualizing customer trajectories over time</p>
            </div>
            <div className="h-60 w-full -ml-4">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-[#14b8a6] text-xs font-bold animate-in fade-in duration-200">
                              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-sm font-black">
                                {payload[0].value} customers
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Total Customers"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#customerGradient)"
                      strokeLinecap="round"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Monthly Signups Bar Chart */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm text-[#18181b] flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#18181b] tracking-tight">Monthly Signups</h2>
              <p className="text-xs text-zinc-500">New customer signups per month</p>
            </div>
            <div className="h-60 w-full -ml-4">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySignupsData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="customerBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#0d9488" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-[#14b8a6] text-xs font-bold animate-in fade-in duration-200">
                              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-sm font-black">
                                +{payload[0].value} new signups
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="New Signups"
                      fill="url(#customerBarGrad)"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden text-[#18181b]">
        {/* Search & Filter Bar */}
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row gap-3 items-center bg-zinc-50/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition-all placeholder:text-zinc-400 text-[#18181b]"
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

          <button className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 h-11 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-[#18181b] hover:bg-zinc-50 transition-all whitespace-nowrap">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100 shadow-inner">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-zinc-800 mt-2">No customers found</p>
                      <p className="text-xs text-zinc-400 max-w-[240px]">We couldn't find any customers matching your criteria.</p>
                      {searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-xs border-zinc-200 hover:bg-zinc-50"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-50 even:bg-zinc-50/30 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500 transition-all border border-zinc-200 group-hover:bg-[#14b8a6] group-hover:text-zinc-950 group-hover:border-[#14b8a6]">
                          {(customer.full_name || customer.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#18181b]">
                            {customer.full_name || "Unnamed Customer"}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">ID: {customer.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-[#18181b]">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Phone className="w-3.5 h-3.5 text-zinc-400" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 text-sm text-zinc-650 max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{customer.address || "No address provided"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(customer.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        Active
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === customer.id ? null : customer.id)}
                        className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-all ml-auto border border-transparent hover:border-zinc-200"
                      >
                        <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                      </button>

                      {activeDropdown === customer.id && (
                        <div className="absolute right-6 top-12 w-56 bg-white border border-zinc-200 shadow-lg rounded-xl py-1.5 z-50 text-left">
                          <div className="px-4 py-1.5 text-[10px] font-bold text-zinc-400 border-b border-zinc-100 tracking-wider">ACTIONS</div>
                          <button className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 text-left">
                            <ShieldCheck className="w-4 h-4 text-zinc-400" /> View Order History
                          </button>
                          <button className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 text-left">
                            <Mail className="w-4 h-4 text-zinc-400" /> Send Notification
                          </button>
                          <div className="h-px bg-zinc-100 my-1 mx-2" />
                          <button className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                            <Ban className="w-4 h-4" /> Suspend Account
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )))}
            </tbody>
          </table>
        </div>
      </div>

      {activeDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
      )}
    </div>
  );
}