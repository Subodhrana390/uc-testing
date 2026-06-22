"use client";

import { useEffect, useState } from "react";
import { fetchProfitAndLossReport } from "@/app/actions/finance-analytics";
import { ProfitLossReport } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

export default function FinanceDashboard() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError("");
      const res = await fetchProfitAndLossReport(month, year);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(res.error || "Failed to load report");
      }
      setLoading(false);
    }
    loadReport();
  }, [month, year]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Finance & Profit Dashboard</h1>
        
        <div className="flex space-x-4">
          <Select value={month.toString()} onValueChange={(v) => { if (v) setMonth(parseInt(v, 10)); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={m.toString()}>Month {m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={year.toString()} onValueChange={(v) => { if (v) setYear(parseInt(v, 10)); }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading financial data...</div>
      ) : error ? (
        <div className="text-red-500 bg-red-50 p-4 rounded-md border border-red-200">{error}</div>
      ) : report ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Revenue Section */}
          <Card className="col-span-1 md:col-span-3 lg:col-span-1 border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-blue-800">Income (Revenue)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Product Revenue</span>
                <span className="font-medium">{formatCurrency(report.income.productRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping Revenue</span>
                <span className="font-medium">{formatCurrency(report.income.shippingRevenue)}</span>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-blue-900">Total Income</span>
                <span className="text-blue-900">{formatCurrency(report.income.totalIncome)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card className="col-span-1 md:col-span-3 lg:col-span-1 border-red-200">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="text-red-800">Expenses</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Cost of Goods Sold (COGS)</span>
                <span className="font-medium text-red-600">{formatCurrency(report.expenses.cogs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping Expense</span>
                <span className="font-medium text-red-600">{formatCurrency(report.expenses.shippingExpense)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gateway Fees</span>
                <span className="font-medium text-red-600">{formatCurrency(report.expenses.paymentGatewayCharges)}</span>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-red-900">Total Expenses</span>
                <span className="text-red-900">{formatCurrency(report.expenses.totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Profit Section */}
          <Card className="col-span-1 md:col-span-3 lg:col-span-1 border-emerald-200 shadow-md">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="text-emerald-800">Profitability</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Profit (Rev - COGS)</span>
                <span className="font-medium">{formatCurrency(report.grossProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Operating Profit</span>
                <span className="font-medium">{formatCurrency(report.operatingProfit)}</span>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between text-2xl font-black">
                <span className="text-emerald-900">Net Profit</span>
                <span className="text-emerald-900">{formatCurrency(report.netProfit)}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      ) : null}
    </div>
  );
}
