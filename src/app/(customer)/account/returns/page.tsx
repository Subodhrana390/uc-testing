"use client";

import { useState, useEffect } from "react";
import { RotateCcw, AlertCircle, ArrowRight, ShieldCheck, FileText, Loader2, PackageSearch, History } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ReturnRequest {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchReturns();
  }, []);

  async function fetchReturns() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error: any) {
      console.error('Error fetching returns:', error);
      toast.error("Failed to load return requests");
    } finally {
      setLoading(false);
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "approved":
        return "default";
      case "pending":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Returns & Replacements</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your active claims and support requests</p>
        </div>
        <Button className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium w-fit">
          <RotateCcw className="w-4 h-4 mr-2" /> Request New Return
        </Button>
      </div>

      {/* Main Card Wrapper */}
      <Card className="border-zinc-200">
        <CardContent className="p-4 sm:p-6 space-y-6">

          {/* Policy Alert Card */}
          <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-zinc-200">
            <AlertCircle className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Quality Control Standards</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Items must be returned in their original packaging. Used, customized, or altered industrial goods and components may not qualify for replacements.
              </p>
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Active & Past Requests</h2>

            {loading ? (
              <div className="flex items-center justify-center min-h-[150px]">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : returns.length > 0 ? (
              <div className="space-y-3">
                {returns.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-zinc-200 hover:bg-gray-50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-zinc-500 shrink-0 border border-zinc-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-400">ID: {request.id.slice(0, 8).toUpperCase()}</span>
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            request.status === 'Approved' ? "bg-emerald-500" :
                              request.status === 'Rejected' ? "bg-red-500" : "bg-indigo-600"
                          )} />
                        </div>
                        <p className="text-sm font-medium text-zinc-900 mt-0.5">{request.reason}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant={getStatusVariant(request.status)} className="text-[9px] uppercase tracking-wider px-2 py-0.5">
                            {request.status}
                          </Badge>
                          <span className="text-[10px] text-zinc-400">
                            Requested {new Date(request.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="w-full sm:w-auto h-8 text-xs text-zinc-600 border border-zinc-200 sm:border-transparent">
                      Manage Claim <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed border-zinc-200 bg-gray-50/50">
                <PackageSearch className="w-10 h-10 text-zinc-300 mb-3" />
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">No active returns found</p>
                <p className="text-xs text-zinc-400 mt-1">Your account currently has no pending replacement claims.</p>
              </div>
            )}
          </div>

          <Separator className="bg-zinc-200" />

          {/* Workflow Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {[
              { step: "01", title: "Submit Request", desc: "Upload product photos, receipt, and details about the defect." },
              { step: "02", title: "Technical Review", desc: "Our support engineers review compliance and authorize the return." },
              { step: "03", title: "Resolution", desc: "Receive either an express replacement dispatch or full account refund." }
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{item.step}. {item.title}</span>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>

      {/* Trust Footer */}
      <Card className="bg-indigo-950 text-white border-zinc-850">
        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-900 rounded-lg flex items-center justify-center border border-indigo-850 shrink-0">
              <ShieldCheck className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-zinc-100">Warranty Protection</p>
              <p className="text-xs text-zinc-400 mt-0.5">All customer returns are processed in accordance with quality management guidelines.</p>
            </div>
          </div>
          <Button variant="outline" className="w-full md:w-auto h-9 bg-indigo-900 text-zinc-200 border-indigo-850 hover:bg-indigo-800 text-xs font-semibold uppercase tracking-wider">
            Full Policy Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}