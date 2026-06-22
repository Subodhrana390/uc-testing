"use client";

import { useEffect, useState } from "react";
import { getInventoryTransactions } from "@/app/actions/inventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, Activity } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function StockLedgerDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await getInventoryTransactions({
        page,
        pageSize,
        search: debouncedSearch,
      });
      if (res.success && res.data) {
        setTransactions(res.data);
        setTotal(res.count);
      } else {
        toast.error(res.error || "Failed to load stock ledger transactions");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to sync stock ledger data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, pageSize, debouncedSearch]);

  // Transaction type styles
  const typeStyles: Record<string, { label: string; color: string; dot: string }> = {
    SALE: { label: "Sale", color: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-600" },
    PURCHASE: { label: "Purchase", color: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-600" },
    RETURN: { label: "Return", color: "bg-purple-50 text-purple-700 border-purple-100", dot: "bg-purple-600" },
    REFUND: { label: "Refund", color: "bg-pink-50 text-pink-700 border-pink-100", dot: "bg-pink-600" },
    RESERVATION: { label: "Reserved", color: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
    RELEASE: { label: "Released", color: "bg-zinc-100 text-zinc-650 border-zinc-200", dot: "bg-zinc-400" },
    ADJUSTMENT: { label: "Adjustment", color: "bg-indigo-50 text-indigo-700 border-indigo-100", dot: "bg-indigo-600" },
  };

  return (
    <div className="p-6 space-y-6 text-[#18181b]">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Stock Ledger & Adjustments</h1>
        <p className="text-zinc-500 text-sm font-medium">
          Comprehensive audit trail of all physical stock movements, sales, purchases, and manual adjustments.
        </p>
      </div>

      <Card className="bg-white rounded-2xl border border-zinc-250 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search stock ledger transactions by product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-11 bg-white border-zinc-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all placeholder:text-zinc-400 text-[#18181b]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 transition-all duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4 pl-8">Date & Time</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-center">Qty Change</th>
                <th className="px-6 py-4 text-center">Stock Levels</th>
                <th className="px-6 py-4">Reason / Notes</th>
                <th className="px-6 py-4 pr-8">Adjusted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-xs text-zinc-400 mt-2">Retrieving stock movement records...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-200 mx-auto mb-4">
                      <Activity className="w-8 h-8 text-zinc-300" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-800">No Transactions Found</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">No stock movement logs recorded yet matching your parameters.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.quantity > 0;
                  const qtyText = isPositive ? `+${tx.quantity}` : `${tx.quantity}`;
                  const qtyColor = isPositive ? "text-teal-600 font-bold" : "text-rose-600 font-bold";
                  const style = typeStyles[tx.type] || { label: tx.type, color: "bg-zinc-50 text-zinc-600 border-zinc-100", dot: "bg-zinc-400" };

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 even:bg-zinc-50/20 transition-colors duration-155">
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
                        <div className="space-y-0.5 max-w-[260px]">
                          <span className="text-sm font-medium text-zinc-700 block truncate" title={tx.products?.name}>
                            {tx.products?.name || "Unknown Product"}
                          </span>
                          {(tx.product_variants?.name || tx.product_variants?.sku) && (
                            <span className="text-[11px] text-zinc-400 font-mono block truncate">
                              Variant SKU: {tx.product_variants.sku || tx.product_variants.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border", style.color)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("text-sm tracking-tight", qtyColor)}>
                          {qtyText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-semibold text-zinc-650">
                          {tx.before_stock} → {tx.after_stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={tx.notes}>
                        <span className="text-xs text-zinc-650">
                          {tx.notes || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 pr-8">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-700 block">
                            {tx.creator?.full_name || "System"}
                          </span>
                          {tx.creator?.email && (
                            <span className="text-[10px] text-zinc-400 block truncate max-w-[150px]">
                              {tx.creator.email}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            variantColor="indigo"
          />
        )}
      </Card>
    </div>
  );
}
