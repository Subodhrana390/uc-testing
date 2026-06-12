"use client";

import { useEffect, useState } from "react";
import { getCustomerInvoices } from "@/app/actions/invoice-customer";
import { FileText, Download, Receipt, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import LogoLoader from "@/components/ui/LogoLoader";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MyInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await getCustomerInvoices();
        if (res.success) {
          setInvoices(res.data || []);
        } else {
          toast.error("Failed to load your invoices");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const handleDownloadPDF = async (invoiceId: string, initialPdfUrl: string | null) => {
    if (downloadingId) return;
    setDownloadingId(invoiceId);
    const toastId = toast.loading("Preparing invoice PDF...");
    try {
      let pdfUrl = initialPdfUrl;
      
      // If PDF URL is not available in database, generate it on the fly
      if (!pdfUrl) {
        const { getInvoicePdfUrl } = await import("@/app/actions/invoice-customer");
        const res = await getInvoicePdfUrl(invoiceId);
        if (!res.success || !res.pdfUrl) {
          throw new Error(res.error || "Failed to generate PDF");
        }
        pdfUrl = res.pdfUrl;
        
        // Update local state so user doesn't have to regenerate if they click again
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, pdf_url: pdfUrl } : inv));
      }

      if (!pdfUrl) {
        throw new Error("Failed to resolve invoice PDF path");
      }

      // Download via Supabase Storage
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
      
      toast.success("Download complete", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to securely download PDF", { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <LogoLoader text="Loading your financial records..." />;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" />
          My Invoices
        </h1>
        <p className="text-zinc-500 text-sm mt-1">View and download your tax-compliant invoices and billing history.</p>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">No Invoices Found</h3>
          <p className="text-zinc-500 mt-1 max-w-sm">When your orders are placed or delivered, your invoices will appear here automatically.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <Card key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-900">{inv.invoice_number}</h3>
                    {inv.status === 'PAID' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Paid</span>}
                    {inv.status === 'PENDING_PAYMENT' && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>}
                    {inv.status === 'REFUNDED' && <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Refunded</span>}
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">
                    Issued on: {new Date(inv.issued_at).toLocaleDateString()}
                  </p>
                  <div className="mt-2 text-xs text-zinc-400">
                    {inv.invoice_items?.map((item: any) => item.product_name).join(', ')}
                  </div>
                </div>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-4 sm:pt-0">
                <div className="font-bold text-lg text-zinc-900">
                  ₹{parseFloat(inv.total_amount).toFixed(2)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  disabled={downloadingId === inv.id}
                  onClick={() => handleDownloadPDF(inv.id, inv.pdf_url)}
                >
                  {downloadingId === inv.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download PDF
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
