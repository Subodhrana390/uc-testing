"use client";

import { useState } from "react";
import { logManualStockAdjustment } from "@/app/actions/finance-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StockTransactionType } from "@/lib/accounting/StockLedgerService";
import { toast } from "react-hot-toast";

export default function StockLedgerDashboard() {
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<StockTransactionType>("ADJUSTMENT");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !qty) return toast.error("Product ID and Quantity are required");

    setLoading(true);
    const res = await logManualStockAdjustment(productId, null, type, parseInt(qty), notes);
    
    if (res.success) {
      toast.success("Stock adjustment logged successfully!");
      setQty("");
      setNotes("");
    } else {
      toast.error(res.error || "Failed to adjust stock");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Stock Ledger & Adjustments</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Log Manual Stock Movement</CardTitle>
            <CardDescription>
              Record damages, expired goods, or inventory corrections. This will generate an exact audit trail in the ledger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product ID</label>
                <Input placeholder="uuid" value={productId} onChange={e => setProductId(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction Type</label>
                <Select value={type} onValueChange={(v) => setType(v as StockTransactionType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADJUSTMENT">General Adjustment (+/-)</SelectItem>
                    <SelectItem value="DAMAGE">Damage (Negative Qty)</SelectItem>
                    <SelectItem value="EXPIRED">Expired (Negative Qty)</SelectItem>
                    <SelectItem value="RETURN_IN">Return Inwards (+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity Change (+ or -)</label>
                <Input type="number" placeholder="e.g. -5 for damages" value={qty} onChange={e => setQty(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason / Notes</label>
                <Input placeholder="e.g. Found damaged box in warehouse" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Recording..." : "Record Transaction"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Ledger Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 italic py-8 text-center bg-gray-50 rounded-md border border-dashed border-gray-200">
              Transaction list will populate here.<br />
              (Connects to <code>inventory_transactions</code> table)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
