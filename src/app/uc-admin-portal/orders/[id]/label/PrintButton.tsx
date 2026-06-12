"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ExportPDFButtonProps {
  order: any;
  invoice: any;
}

export function PrintButton({ order, invoice }: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Generating PDF...");
    try {
      const { generateShippingLabelAndInvoicePDF } = await import("@/lib/label-pdf");
      const doc = await generateShippingLabelAndInvoicePDF({ order, invoice });
      const orderShortId = order.id.slice(0, 8).toUpperCase();
      doc.save(`shipping_label_invoice_${orderShortId}.pdf`);
      toast.success("PDF exported successfully", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate PDF", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button 
      onClick={handleExportPDF}
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
    >
      <FileDown className="w-4 h-4" />
      {isGenerating ? "Generating..." : "Export PDF"}
    </button>
  );
}
