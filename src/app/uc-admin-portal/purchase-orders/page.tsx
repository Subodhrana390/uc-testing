"use client";

import { useEffect, useState } from "react";
import { receivePurchaseOrderAction, fetchPurchaseOrdersAction } from "@/app/actions/finance-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function PurchaseOrdersDashboard() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchPurchaseOrdersAction();
      if (res.success && res.data) {
        setPos(res.data);
      } else {
        toast.error(res.error || "Failed to load purchase orders");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred while loading purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  const handleReceive = async (id: string) => {
    setReceivingId(id);
    const toastId = toast.loading("Processing purchase order reception and updating average cost...");
    try {
      const res = await receivePurchaseOrderAction(id);
      if (res.success) {
        toast.success("Purchase order marked as RECEIVED. Inventory levels and average cost prices have been recalculated!", { id: toastId });
        await loadPurchaseOrders();
      } else {
        toast.error(res.error || "Failed to mark purchase order as received", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred", { id: toastId });
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 text-[#18181b]">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <Button disabled>+ New Purchase Order</Button>
      </div>

      <Card className="bg-white border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-zinc-150">
          <CardTitle className="text-lg font-bold text-zinc-800">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-xs font-semibold">Loading purchase orders from database...</p>
            </div>
          ) : pos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <p className="text-sm font-bold text-zinc-700">No Purchase Orders Found</p>
              <p className="text-xs text-zinc-400 mt-1">There are no purchase orders registered in the system yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-3.5 pl-8">ID</th>
                    <th className="px-6 py-3.5">Supplier Name</th>
                    <th className="px-6 py-3.5">Date Created</th>
                    <th className="px-6 py-3.5">Total Cost</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 pr-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pos.map(po => (
                    <tr key={po.id} className="hover:bg-zinc-50/50 transition-colors duration-150">
                      <td className="px-6 py-4 pl-8 font-mono text-xs text-zinc-500" title={po.id}>
                        {po.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-700">{po.supplier_name}</td>
                      <td className="px-6 py-4 text-zinc-500">
                        {new Date(po.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-800">
                        ₹ {Number(po.total_cost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          po.status === 'RECEIVED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${po.status === 'RECEIVED' ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'}`} />
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 pr-8 text-right">
                        {po.status === "PENDING" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-3 rounded-lg text-xs font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-250 cursor-pointer" 
                            onClick={() => handleReceive(po.id)}
                            disabled={receivingId === po.id}
                          >
                            {receivingId === po.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Mark Received"
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-blue-50/50 border-l-4 border-blue-500 p-5 rounded-r-2xl border border-blue-100 shadow-sm">
        <h3 className="font-bold text-blue-800 mb-1.5 text-sm uppercase tracking-wider">How Weighted Average Cost Works</h3>
        <p className="text-blue-700 text-xs leading-relaxed">
          Clicking <strong>Mark Received</strong> will trigger the <code>InventoryValuationService</code>. It will automatically re-calculate your 
          products' exact <code>average_cost_price</code> based on the new supplier price vs your existing stock. This ensures your P&L margins stay 100% accurate!
        </p>
      </div>
    </div>
  );
}
