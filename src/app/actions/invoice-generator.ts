import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { numberToWords } from "@/lib/numberToWords";
import { getDisplayOrderId } from "@/lib/order";
import { LOGO_BASE_64 } from "@/lib/logo-base64";

const getLogoBase64 = () => {
  return LOGO_BASE_64;
};

// --- Calculation Utilities & Types ---

export interface InvoiceCalculations {
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  freightCharges: number;
  freightGst: number;
  discount: number;
  grandTotal: number;
  isIntraState: boolean;
}

export function determineIsIntraState(address: string, sellerState: string = "punjab"): boolean {
  if (!address) return false;
  const lowerAddress = address.toLowerCase();
  if (sellerState === "punjab") {
    return lowerAddress.includes("punjab") ||
      lowerAddress.includes("pb") ||
      /14[0-9]{4}/.test(address) ||
      /15[0-2][0-9]{3}/.test(address) ||
      /160[0-9]{3}/.test(address);
  }
  return lowerAddress.includes(sellerState.toLowerCase());
}

export function validateInvoiceData(invoice: any, items: any[]) {
  if (!invoice.invoice_number) throw new Error("Validation Error: Invoice number is required.");
  if (!invoice.orders?.customer_name) throw new Error("Validation Error: Customer name is required.");

  for (const item of items) {
    const productName = item.products?.name || item.product_name;
    const hsn = item.products?.hsn_code || item.hsn_code;
    const qty = item.quantity;
    const rate = parseFloat(item.unit_price);

    if (!productName) throw new Error("Validation Error: Product name is required.");
    if (!hsn) throw new Error(`Validation Error: HSN code is required for product '${productName}'.`);
    if (qty <= 0) throw new Error(`Validation Error: Quantity must be > 0 for product '${productName}'.`);
    if (rate <= 0) throw new Error(`Validation Error: Rate must be > 0 for product '${productName}'.`);
  }
}

export const formatCurrency = (amount: number) => `Rs. ${amount.toFixed(2)}`;

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
      .select(`
        *,
        products:product_id (*)
      `)
      .eq("invoice_id", invoiceId);

    if (itemsError) throw new Error("Invoice items not found");

    // 3. Validation
    validateInvoiceData(invoice, items);

    // Determine State for GST Logic
    const addressStr = invoice.orders.shipping_address || invoice.orders.billing_address || "";
    const isIntraState = determineIsIntraState(addressStr, "punjab");

    // 4. Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const businessInfo = {
      name: "UC ENTERPRISES",
      address: "Hadhbast no-44, Ambala Delhi National Highway, Bisanpur, Zirakpur, Punjab, 140603, India.",
      gstin: "03DYEPD4654N1ZB",
      udyam: "UDYAM-PB-18-0013501",
      email: "ucenterprises1@gmail.com",
      phone: "9888863377"
    };

    // Outer borders
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    // Top text: "Tax Invoice"
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Tax Invoice", pageWidth / 2, 12, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Original / Duplicate Bill", 200, 12, { align: "right" });

    // Top Box (Company Info) - Starts at y=14
    doc.rect(10, 14, 190, 24);

    const logoBase64 = getLogoBase64();
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 12, 16, 22, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(businessInfo.name, 35, 20);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(businessInfo.address, 35, 24);
      doc.text(`GSTIN: ${businessInfo.gstin} | UDYAM: ${businessInfo.udyam}`, 35, 29);
      doc.text(`Contact No. : +91 ${businessInfo.phone} | Email: ${businessInfo.email}`, 35, 34);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(businessInfo.name, 40, 20);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(businessInfo.address, 40, 24);
      doc.text(`GSTIN: ${businessInfo.gstin} | UDYAM: ${businessInfo.udyam}`, 40, 29);
      doc.text(`Contact No. : +91 ${businessInfo.phone} | Email: ${businessInfo.email}`, 40, 34);
    }

    // Bill To & Invoice Info Box (y=38 to 78, height 40)
    doc.rect(10, 38, 190, 40);
    doc.line(105, 38, 105, 78); // vertical split

    // Left Column: Bill To (y=38 to 58), Ship To (y=58 to 78)
    doc.line(10, 58, 105, 58); // horizontal split for left column

    // Bill To Header
    doc.setFillColor(220, 235, 245);
    doc.rect(10, 38, 95, 5, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To", 12, 42);

    doc.setFont("helvetica", "normal");
    doc.text(`Name : ${invoice.orders.customer_name || "Customer"}`, 12, 47);
    const billAddress = doc.splitTextToSize(invoice.orders.shipping_address || "", 80);
    doc.text(`Address :`, 12, 51);
    doc.text(billAddress, 25, 51);

    // Ship To Header
    doc.setFillColor(220, 235, 245);
    doc.rect(10, 58, 95, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Shipping To", 12, 62);

    doc.setFont("helvetica", "normal");
    doc.text(`Name : ${invoice.orders.customer_name || "Customer"}`, 12, 67);
    doc.text(`Address :`, 12, 71);
    doc.text(billAddress, 25, 71);

    // Right Column
    doc.line(105, 58, 200, 58); // horizontal split

    doc.text(`# Inv. No. :`, 107, 42);
    doc.text(invoice.invoice_number, 140, 42);

    doc.text(`Inv. Date :`, 107, 46);
    doc.text(new Date(invoice.issued_at).toLocaleDateString('en-GB'), 140, 46);

    doc.text(`Payment Mode :`, 107, 50);
    doc.text(invoice.orders.payment_method || "Online", 140, 50);

    doc.text(`State :`, 107, 54);
    doc.text(isIntraState ? "Punjab" : "Other State", 140, 54);

    doc.text(`Reverse Charge :`, 107, 58);
    doc.text("NO", 140, 58);

    doc.text(`Order No :`, 107, 62);
    doc.text(getDisplayOrderId(invoice.orders.id, invoice.orders.created_at), 140, 62);

    doc.text(`Delivery Date :`, 107, 66);
    doc.text(invoice.orders.delivery_estimate || "-", 140, 66);

    doc.text(`Transport Details :`, 107, 70);
    doc.text(invoice.orders.carrier || "-", 140, 70);

    let totalIgst = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let subtotalTaxable = 0;
    let totalQuantity = 0;

    // Table Data
    const tableData = items.map((item: any, index: number) => {
      const qty = item.quantity;
      const unitPrice = parseFloat(item.unit_price);
      const itemTotal = unitPrice * qty;

      const productTotalGst = item.products?.gst_rate || item.products?.igst_rate || (item.products?.cgst_rate + item.products?.sgst_rate) || 0;
      const isTaxInclusive = item.products?.is_tax_inclusive || false;

      let baseTotal = itemTotal;
      let taxAmount = 0;

      if (productTotalGst > 0) {
        if (isTaxInclusive) {
          baseTotal = itemTotal / (1 + productTotalGst / 100);
          taxAmount = itemTotal - baseTotal;
        } else {
          taxAmount = itemTotal * (productTotalGst / 100);
        }
      }

      const baseUnitPrice = baseTotal / qty;
      const hsn = item.products?.hsn_code || item.hsn_code;

      subtotalTaxable += baseTotal;
      totalQuantity += qty;

      let cgstRate = 0, sgstRate = 0, igstRate = 0;
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

      // Split GST based on Intrastate or Interstate
      if (isIntraState) {
        cgstRate = productTotalGst / 2;
        sgstRate = productTotalGst / 2;
        cgstAmount = taxAmount / 2;
        sgstAmount = taxAmount / 2;
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
      } else {
        igstRate = productTotalGst;
        igstAmount = taxAmount;
        totalIgst += igstAmount;
      }

      const lineTotal = baseTotal + taxAmount;

      return [
        index + 1,
        item.products?.name || item.product_name,
        hsn,
        qty,
        `₹ ${baseUnitPrice.toFixed(2)}`,
        `₹ ${baseTotal.toFixed(2)}`,
        isIntraState ? `${cgstRate}% / ${sgstRate}%` : `${igstRate}%`,
        `₹ ${taxAmount.toFixed(2)}`,
        `₹ ${lineTotal.toFixed(2)}`
      ];
    });

    (doc as any).autoTable({
      startY: 78,
      head: [
        [
          { content: 'Sr', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Goods & Service Description', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
          { content: 'HSN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Quantity', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Rate', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } },
          { content: 'Taxable', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } },
          { content: isIntraState ? 'CGST / SGST' : 'IGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } }
        ],
        [
          { content: '%', styles: { halign: 'center' } },
          { content: 'Amt.', styles: { halign: 'right' } }
        ]
      ],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 235, 245], textColor: 0, lineWidth: 0.1, lineColor: 0, fontSize: 8 },
      bodyStyles: { textColor: 0, lineWidth: 0.1, lineColor: 0, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 20, halign: 'right' },
        8: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 10, right: 10 },
      foot: [
        [
          { content: 'Sub-Total:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: totalQuantity.toString(), styles: { halign: 'center', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'right' } },
          { content: `₹ ${subtotalTaxable.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'center' } },
          { content: `₹ ${(totalIgst + totalCgst + totalSgst).toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `₹ ${(subtotalTaxable + totalIgst + totalCgst + totalSgst).toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
        ]
      ],
      footStyles: { fillColor: 255, textColor: 0, lineWidth: 0.1, lineColor: 0, fontSize: 8 }
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // Check if footer fits, otherwise add page
    if (finalY + 85 > doc.internal.pageSize.getHeight() - 10) {
      doc.addPage();
      finalY = 10;
    }

    // Draw Footer Outer Box
    doc.setLineWidth(0.3);
    doc.rect(10, finalY, 190, 80); // height 80

    // Left side: Bank Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(220, 235, 245);
    doc.rect(10, finalY, 120, 5, "F");
    doc.text("Our Bank Details", 12, finalY + 4);

    doc.text("Bank Name :", 12, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.text("STATE BANK OF INDIA", 35, finalY + 10);

    doc.setFont("helvetica", "bold");
    doc.text("Branch :", 12, finalY + 14);
    doc.setFont("helvetica", "normal");
    doc.text("Delhi", 35, finalY + 14);

    doc.setFont("helvetica", "bold");
    doc.text("Account No :", 12, finalY + 18);
    doc.setFont("helvetica", "normal");
    doc.text("20412XXXX05", 35, finalY + 18);

    doc.setFont("helvetica", "bold");
    doc.text("IFSC Code :", 12, finalY + 22);
    doc.setFont("helvetica", "normal");
    doc.text("SBIN003XXXX", 35, finalY + 22);

    doc.setFont("helvetica", "bold");
    doc.text("UPI ID :", 12, finalY + 26);
    doc.setFont("helvetica", "normal");
    doc.text("ucenterprises@upi", 35, finalY + 26);

    // Horizontal line under bank details
    doc.line(10, finalY + 30, 130, finalY + 30);

    // Invoice Total in Words
    doc.setFillColor(220, 235, 245);
    doc.rect(10, finalY + 30, 120, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Total (In Words)", 12, finalY + 34);

    // Ensure accurate calculation
    const freightAmount = parseFloat(invoice.shipping_amount || 0);
    const freightGst = Math.round(freightAmount * 0.18 * 100) / 100;
    const discountAmount = parseFloat(invoice.discount_amount || 0);

    const calculatedGrandTotal = subtotalTaxable + totalCgst + totalSgst + totalIgst + freightAmount + freightGst - discountAmount;

    // Calculations Verification
    const tolerance = 1.0; // 1 rupee tolerance for floating point math
    if (Math.abs(calculatedGrandTotal - parseFloat(invoice.total_amount)) > tolerance) {
      console.warn(`Calculated total (${calculatedGrandTotal}) differs from invoice total (${invoice.total_amount})`);
    }

    doc.setFont("helvetica", "normal");
    doc.text(`Rupees ${numberToWords(Math.round(calculatedGrandTotal))} Only`, 12, finalY + 40);

    // Line below words
    doc.line(10, finalY + 44, 200, finalY + 44);

    // Declaration
    doc.setFontSize(7);
    doc.text("Declaration", 12, finalY + 48);
    doc.text("1. Subject to jurisdiction.", 12, finalY + 52);
    doc.text("2. Terms & conditions are subject to our trade policy.", 12, finalY + 55);
    doc.text("3. Our risk & responsibility ceases after the delivery of goods.", 12, finalY + 58);
    doc.text("E. & O.E.", 12, finalY + 62);

    // Right Side: Summary Table
    doc.line(130, finalY, 130, finalY + 80); // vertical line for summary

    doc.setFillColor(220, 235, 245);
    doc.rect(130, finalY, 70, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("SUMMARY", 135, finalY + 4);
    doc.text("AMOUNT", 195, finalY + 4, { align: "right" });

    doc.line(130, finalY + 5, 200, finalY + 5);

    let currentY = finalY + 9;

    doc.setFont("helvetica", "normal");
    doc.text("Taxable Value", 135, currentY);
    doc.text(`₹ ${subtotalTaxable.toFixed(2)}`, 195, currentY, { align: "right" });
    doc.line(130, currentY + 1, 200, currentY + 1);
    currentY += 5;

    if (isIntraState) {
      doc.text("CGST Amount", 135, currentY);
      doc.text(`₹ ${totalCgst.toFixed(2)}`, 195, currentY, { align: "right" });
      doc.line(130, currentY + 1, 200, currentY + 1);
      currentY += 5;

      doc.text("SGST Amount", 135, currentY);
      doc.text(`₹ ${totalSgst.toFixed(2)}`, 195, currentY, { align: "right" });
      doc.line(130, currentY + 1, 200, currentY + 1);
      currentY += 5;
    } else {
      doc.text("IGST Amount", 135, currentY);
      doc.text(`₹ ${totalIgst.toFixed(2)}`, 195, currentY, { align: "right" });
      doc.line(130, currentY + 1, 200, currentY + 1);
      currentY += 5;
    }

    doc.text("Freight Charges", 135, currentY);
    doc.text(`₹ ${freightAmount.toFixed(2)}`, 195, currentY, { align: "right" });
    doc.line(130, currentY + 1, 200, currentY + 1);
    currentY += 5;

    doc.text("GST on Freight", 135, currentY);
    doc.text(`₹ ${freightGst.toFixed(2)}`, 195, currentY, { align: "right" });
    doc.line(130, currentY + 1, 200, currentY + 1);
    currentY += 5;

    doc.text("Discount", 135, currentY);
    doc.text(discountAmount > 0 ? `-₹ ${discountAmount.toFixed(2)}` : "₹ 0.00", 195, currentY, { align: "right" });
    doc.line(130, currentY + 1, 200, currentY + 1);
    currentY += 5;

    doc.setFillColor(220, 235, 245);
    doc.rect(130, currentY, 70, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Grand Total", 135, currentY + 6);
    doc.text(`₹ ${calculatedGrandTotal.toFixed(2)}`, 195, currentY + 6, { align: "right" });

    // Signature
    doc.setFont("helvetica", "normal");
    doc.text("For, UC ENTERPRISES", 165, finalY + 60, { align: "center" });
    doc.text("Authorized Signatory", 165, finalY + 75, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text("Thank You For Doing Business With Us!", 105, finalY + 100, { align: "center" });

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
