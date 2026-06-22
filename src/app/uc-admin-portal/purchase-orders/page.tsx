"use client";

import { useEffect, useState } from "react";
import { receivePurchaseOrderAction } from "@/app/actions/finance-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// A mock table to demonstrate PO actions. In a real app, this data would be fetched from Supabase via Server Action.
export default function PurchaseOrdersDashboard() {
  const [pos, setPos] = useState([
    { id: "e10b24dc-d3d6-444d-b3f9-7157ccf72691", supplier: "Carbon Fiber Supply Co.", totalCost: 50000, status: "PENDING", date: "2026-06-21" },
    { id: "f21b35dc-c4d7-555e-a4e8-8268dde83702", supplier: "Epoxy Resins Pvt Ltd", totalCost: 15000, status: "RECEIVED", date: "2026-06-19" },
  ]);

  const handleReceive = async (id: string) => {
    // In production, uncomment the server action below
    // const res = await receivePurchaseOrderAction(id);
    // if (res.success) alert("Received successfully");
    // else alert(res.error);

    setPos(pos.map(p => p.id === id ? { ...p, status: "RECEIVED" } : p));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <Button>+ New Purchase Order</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600">ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Supplier</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Total Cost</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{po.id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 font-medium">{po.supplier}</td>
                    <td className="px-4 py-3 text-gray-500">{po.date}</td>
                    <td className="px-4 py-3">₹ {po.totalCost.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {po.status === "PENDING" && (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleReceive(po.id)}>
                          Mark Received
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
        <h3 className="font-bold text-blue-800 mb-1">How Weighted Average Cost Works</h3>
        <p className="text-blue-700 text-sm">
          Clicking <strong>Mark Received</strong> will trigger the <code>InventoryValuationService</code>. It will automatically re-calculate your 
          products' exact <code>average_cost_price</code> based on the new supplier price vs your existing stock. This ensures your P&L margins stay 100% accurate!
        </p>
      </div>
    </div>
  );
}
