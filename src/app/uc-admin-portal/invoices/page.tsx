"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { getInvoiceStats, resendInvoiceEmail } from "@/app/actions/invoice-admin";
import {
  FileText,
  Search,
  Download,
  Mail,
  RefreshCw,
  Activity,
  AlertTriangle,
  TrendingUp,
  X,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import { createClient } from "@/utils/supabase/client";
import { Pagination } from "@/components/ui/pagination";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InvoiceAdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [tableInvoices, setTableInvoices] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const supabase = useMemo(() => createClient(), []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const statsRes = await getInvoiceStats();
      if (statsRes.success) setStats(statsRes.data);
    } catch (error: any) {
      toast.error("Failed to fetch invoice stats");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTableInvoices = useCallback(async () => {
    setTableLoading(true);
    try {
      let q = supabase
        .from("invoices")
        .select("*, orders(customer_name, customer_email)", { count: "exact" });

      if (debouncedSearchQuery) {
        q = supabase
          .from("invoices")
          .select("*, orders!inner(customer_name, customer_email)", { count: "exact" });
        q = q.or(`invoice_number.ilike.%${debouncedSearchQuery}%,orders.customer_name.ilike.%${debouncedSearchQuery}%`);
      }

      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, count, error } = await q
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      setTableInvoices(data || []);
      setTotalItems(count || 0);
    } catch (error) {
      console.error("Error fetching table invoices:", error);
      toast.error("Failed to load invoices table");
    } finally {
      setTableLoading(false);
    }
  }, [supabase, currentPage, pageSize, debouncedSearchQuery, statusFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchTableInvoices();
  }, [fetchTableInvoices]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when filters or query change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchDashboardData(),
      fetchTableInvoices()
    ]);
  };

  const handleDownloadPDF = async (pdfUrl: string) => {
    if (!pdfUrl) return toast.error("PDF has not been generated yet.");
    try {
      const { data, error } = await supabase.storage.from("invoices").download(pdfUrl);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfUrl.split('/').pop() || 'Invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const handleResendEmail = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const res = await resendInvoiceEmail(orderId);
      if (res.success) {
        toast.success("Invoice queued for email delivery");
      } else {
        throw new Error(res.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invoice");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && !stats) return <LogoLoader text="Loading financial records..." />;

  return (
    <div className="space-y-6 p-6 lg:p-8 w-full px-4 md:px-8 2xl:px-12 mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Invoice Management</h1>
            <p className="text-sm font-medium text-blue-100 mt-1">GST-compliant financial records, PDF generation, and billing history</p>
          </div>
          <Button onClick={handleRefresh} variant="secondary" className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Data
          </Button>
        </div>

        {/* Analytics Widgets */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Total Revenue</span>
              <Activity className="w-4 h-4 text-blue-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                ₹{stats?.totalRevenue?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Invoices Issued</span>
              <FileText className="w-4 h-4 text-blue-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">{stats?.totalInvoices || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Pending Payment</span>
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">{stats?.pendingCount || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Paid Success</span>
              <TrendingUp className="w-4 h-4 text-green-300" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">{stats?.paidCount || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ledger */}
      <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 items-center bg-zinc-50/30">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Invoice # or Customer Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all placeholder:text-zinc-400 text-[#18181b]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-48 shrink-0">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-11 border-zinc-200 rounded-xl text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING_PAYMENT">Pending</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-8">Invoice Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <p className="text-xs font-semibold">Loading invoices...</p>
                    </div>
                  </td>
                </tr>
              ) : tableInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-zinc-500">
                    No invoices match your search criteria.
                  </td>
                </tr>
              ) : (
                tableInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50 transition-all duration-200">
                    <td className="px-6 py-4 pl-8">
                      <div className="font-bold text-zinc-800">{inv.invoice_number}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{new Date(inv.issued_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-zinc-700">{inv.orders?.customer_name || "N/A"}</div>
                      <div className="text-[11px] text-zinc-400">{inv.orders?.customer_email || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-800">₹{parseFloat(inv.total_amount).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-lg border",
                        inv.status === 'PAID' ? "bg-green-50 text-green-700 border-green-200" :
                        inv.status === 'PENDING_PAYMENT' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        inv.status === 'REFUNDED' ? "bg-violet-50 text-violet-700 border-violet-200" :
                        "bg-zinc-100 text-zinc-600 border-zinc-200"
                      )}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!inv.pdf_url}
                          onClick={() => handleDownloadPDF(inv.pdf_url)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={processingId === inv.order_id}
                          onClick={() => handleResendEmail(inv.order_id)}
                          className="h-8 text-xs gap-1.5"
                        >
                          {processingId === inv.order_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Email
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!tableLoading && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            variantColor="indigo"
          />
        )}
      </Card>
    </div>
  );
}
