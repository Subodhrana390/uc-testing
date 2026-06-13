"use server";

import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export async function generateAndStoreInvoicePDF(invoiceId: string) {
  try {
    const supabase = createServiceRoleClient();

    // 1. Fetch Invoice Details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        orders (*),
        profiles:user_id (*)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) throw new Error("Invoice not found");

    // 2. Fetch Invoice Items
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);

    if (itemsError) throw new Error("Invoice items not found");

    // 3. Generate PDF
    const doc = new jsPDF();
    const businessInfo = {
      name: "UC ENTERPRISES",
      address: "Hadhbast no-44, Ambala Delhi National Highway, Bisanpur, Zirakpur, Punjab, 140603, India.",
      gstin: "03DYEPD4654N1ZB",
      udyam: "UDYAM-PB-18-0013501",
      email: "ucenterprises1@gmail.com",
      phone: "9888863377"
    };

    // Header
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22);
    doc.text(businessInfo.name, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const businessAddressLines = doc.splitTextToSize(businessInfo.address, 180);
    doc.text(businessAddressLines, 14, 28);

    const nextY = 28 + (businessAddressLines.length * 5);
    doc.text(`GSTIN: ${businessInfo.gstin} | UDYAM: ${businessInfo.udyam}`, 14, nextY);
    doc.text(`Email: ${businessInfo.email} | Phone: ${businessInfo.phone}`, 14, nextY + 5);

    // Line
    const lineY = nextY + 10;
    doc.setDrawColor(249, 115, 22);
    doc.line(14, lineY, 196, lineY);

    // Invoice Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", 14, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoice_number}`, 14, 62);
    doc.text(`Date: ${new Date(invoice.issued_at).toLocaleDateString()}`, 14, 67);
    doc.text(`Order ID: ${invoice.orders.id.split('-')[0].toUpperCase()}`, 14, 72);
    doc.text(`Payment: ${invoice.status}`, 14, 77);

    // Billing Details
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 120, 55);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.orders.customer_name || "Customer", 120, 62);
    doc.text(invoice.orders.customer_email || "", 120, 67);
    if (invoice.orders.phone) doc.text(invoice.orders.phone, 120, 72);

    const splitAddress = doc.splitTextToSize(invoice.orders.shipping_address || "", 70);
    doc.text(splitAddress, 120, 77);

    // Table
    const tableData = items.map((item, index) => {
      const unitPrice = parseFloat(item.unit_price);
      const qty = item.quantity;
      const amount = parseFloat(item.line_total);
      const hsn = item.hsn_code || "-";
      return [
        index + 1,
        item.product_name,
        hsn,
        qty,
        unitPrice.toFixed(2),
        amount.toFixed(2)
      ];
    });

    (doc as any).autoTable({
      startY: Math.max(85, 77 + (splitAddress.length * 5)),
      head: [['#', 'Description', 'HSN', 'Qty', 'Unit Price', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
      },
    });

    // Totals
    const finalTableY = (doc as any).lastAutoTable.finalY;

    let currentY = finalTableY + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Subtotal
    doc.text(`Subtotal:`, 140, currentY);
    doc.text(`${invoice.currency} ${parseFloat(invoice.subtotal).toFixed(2)}`, 190, currentY, { align: "right" });
    currentY += 6;

    // GST (Tax)
    if (parseFloat(invoice.tax_amount) > 0) {
      doc.text(`GST:`, 140, currentY);
      doc.text(`${invoice.currency} ${parseFloat(invoice.tax_amount).toFixed(2)}`, 190, currentY, { align: "right" });
      currentY += 6;
    }

    // Shipping
    if (parseFloat(invoice.shipping_amount) > 0) {
      doc.text(`Shipping:`, 140, currentY);
      doc.text(`${invoice.currency} ${parseFloat(invoice.shipping_amount).toFixed(2)}`, 190, currentY, { align: "right" });
      currentY += 6;
    }

    // Discount
    if (parseFloat(invoice.discount_amount) > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Discount:`, 140, currentY);
      doc.text(`-${invoice.currency} ${parseFloat(invoice.discount_amount).toFixed(2)}`, 190, currentY, { align: "right" });
      doc.setTextColor(0);
      currentY += 6;
    }

    // Grand Total
    currentY += 2;
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total:`, 140, currentY);
    doc.text(`${invoice.currency} ${parseFloat(invoice.total_amount).toFixed(2)}`, 190, currentY, { align: "right" });

    // Footer
    const finalY = finalTableY + 40;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    doc.text("1. This is a computer generated invoice and does not require a physical signature.", 14, finalY);
    doc.text("2. Please quote invoice number for all future correspondence.", 14, finalY + 5);
    doc.text("3. Terms & Conditions apply. Thank you for your business!", 14, finalY + 10);

    // 4. Save to buffer and upload to Supabase Storage
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const fileName = `${invoice.user_id}/${invoice.invoice_number}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 5. Update Database with PDF Path
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ pdf_url: fileName })
      .eq("id", invoiceId);

    if (updateError) throw updateError;

    return { success: true, pdfUrl: fileName };

  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
    return { success: false, error: error.message };
  }
}
