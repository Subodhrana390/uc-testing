import { getDisplayOrderId } from "./order";
import { numberToWords } from "./numberToWords";

const getLogoBase64 = async () => {
  if (typeof window === "undefined") {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "logo.png");
    try {
      const bitmap = fs.readFileSync(filePath);
      return `data:image/png;base64,${bitmap.toString("base64")}`;
    } catch {
      return null;
    }
  } else {
    try {
      const response = await fetch("/logo.png");
      const blob = await response.blob();
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
};

export interface InvoiceData {
  orderId: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  items: any[];
  totalAmount: number;
  taxAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  paymentMethod?: string;
  carrier?: string;
  paymentStatus?: string;
}

export const generateInvoicePDF = async (data: InvoiceData) => {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

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

  const logoBase64 = await getLogoBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 12, 16, 20, 20);
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
  doc.text(`Name : ${data.customerName || "Customer"}`, 12, 47);
  const billAddress = doc.splitTextToSize(data.address || "", 80);
  doc.text(`Address :`, 12, 51);
  doc.text(billAddress, 25, 51);

  // Shipp To Header
  doc.setFillColor(220, 235, 245);
  doc.rect(10, 58, 95, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Shipp To", 12, 62);

  doc.setFont("helvetica", "normal");
  doc.text(`Name : ${data.customerName || "Customer"}`, 12, 67);
  doc.text(`Address :`, 12, 71);
  doc.text(billAddress, 25, 71);

  // Right Column
  doc.line(105, 58, 200, 58); // horizontal split

  doc.text(`# Inv. No. :`, 107, 42);
  doc.text(getDisplayOrderId(data.orderId, data.date), 140, 42);

  doc.text(`Inv. Date :`, 107, 46);
  doc.text(new Date(data.date).toLocaleDateString('en-GB'), 140, 46);

  doc.text(`Payment Mode :`, 107, 50);
  doc.text(data.paymentMethod || "Online", 140, 50);

  doc.text(`Payment Status :`, 107, 54);
  doc.text(data.paymentStatus === "PAID" || data.paymentStatus === "Paid" ? "Paid" : "Pending", 140, 54);

  doc.text(`Reverse Charge :`, 107, 58);
  doc.text("NO", 140, 58);

  doc.text(`Order No :`, 107, 62);
  doc.text(getDisplayOrderId(data.orderId, data.date), 140, 62);

  doc.text(`Delivery Date :`, 107, 66);
  doc.text("-", 140, 66);

  doc.text(`Transport Details :`, 107, 70);
  doc.text(data.carrier || "-", 140, 70);

  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let subtotalTaxable = 0;
  let totalQuantity = 0;

  // Table Data
  const tableData = data.items.map((item: any, index: number) => {
    const qty = item.quantity;
    const unitPrice = parseFloat(item.unit_price);
    const itemTotal = unitPrice * qty;
    const igst = item.products?.igst_rate || 0;
    const cgst = item.products?.cgst_rate || 0;
    const sgst = item.products?.sgst_rate || 0;
    const rate = igst > 0 ? igst : (cgst + sgst);

    const isTaxInclusive = item.products?.is_tax_inclusive || false;

    let baseTotal = itemTotal;
    let taxAmount = 0;
    let lineTotal = itemTotal;

    if (rate > 0) {
      if (isTaxInclusive) {
        baseTotal = itemTotal / (1 + rate / 100);
        taxAmount = itemTotal - baseTotal;
      } else {
        taxAmount = itemTotal * (rate / 100);
        lineTotal = itemTotal + taxAmount;
      }
    }

    const baseUnitPrice = baseTotal / qty;
    const hsn = item.products?.hsn_code || item.hsn_code || "-";

    subtotalTaxable += baseTotal;
    totalQuantity += qty;

    // Breakdown tax amounts based on rates
    if (igst > 0) {
      totalIgst += taxAmount;
    } else {
      const totalCgstSgst = cgst + sgst;
      if (totalCgstSgst > 0) {
        totalCgst += taxAmount * (cgst / totalCgstSgst);
        totalSgst += taxAmount * (sgst / totalCgstSgst);
      }
    }

    return [
      index + 1,
      item.products?.name || item.product_name || "Product",
      hsn,
      qty,
      baseUnitPrice.toFixed(2),
      baseTotal.toFixed(2),
      rate > 0 ? `${rate}%` : "-",
      taxAmount > 0 ? taxAmount.toFixed(2) : "-",
      lineTotal.toFixed(2)
    ];
  });

  (doc as any).autoTable({
    startY: 78,
    head: [
      [
        { content: 'Sr.No.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Goods & Service Description', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
        { content: 'HSN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Quantity', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Rate', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } },
        { content: 'Taxable', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } },
        { content: 'GST', colSpan: 2, styles: { halign: 'center' } },
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
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 10, right: 10 },
    foot: [
      [
        { content: 'Sub-Total:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totalQuantity.toString(), styles: { halign: 'center', fontStyle: 'bold' } },
        { content: '', styles: { halign: 'right' } },
        { content: subtotalTaxable.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: '', styles: { halign: 'center' } },
        { content: (totalIgst + totalCgst + totalSgst).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: data.totalAmount.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }
      ]
    ],
    footStyles: { fillColor: 255, textColor: 0, lineWidth: 0.1, lineColor: 0, fontSize: 8 }
  });

  let finalY = (doc as any).lastAutoTable.finalY;

  if (finalY + 75 > doc.internal.pageSize.getHeight() - 10) {
    doc.addPage();
    finalY = 10;
  }

  // Draw Footer Outer Box
  doc.setLineWidth(0.3);
  doc.rect(10, finalY, 190, 70);

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
  doc.text("Invoice Total in Word", 12, finalY + 34);
  doc.setFont("helvetica", "normal");
  doc.text(`Rupees ${numberToWords(Math.round(data.totalAmount))} Only`, 12, finalY + 40);

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
  doc.line(130, finalY, 130, finalY + 70); // vertical line for summary

  doc.setFillColor(220, 235, 245);
  doc.rect(130, finalY, 70, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SUMMARY", 145, finalY + 4);
  doc.text("AMOUNT", 198, finalY + 4, { align: "right" });

  doc.line(130, finalY + 5, 200, finalY + 5);

  doc.setFont("helvetica", "normal");
  doc.text("CGST Amt :", 175, finalY + 9, { align: "right" });
  doc.text(totalCgst.toFixed(2), 198, finalY + 9, { align: "right" });
  doc.line(130, finalY + 10, 200, finalY + 10);

  doc.text("SGST Amt :", 175, finalY + 14, { align: "right" });
  doc.text(totalSgst.toFixed(2), 198, finalY + 14, { align: "right" });
  doc.line(130, finalY + 15, 200, finalY + 15);

  doc.text("IGST Amt :", 175, finalY + 19, { align: "right" });
  doc.text(totalIgst.toFixed(2), 198, finalY + 19, { align: "right" });
  doc.line(130, finalY + 20, 200, finalY + 20);

  doc.text("Freight Packing Charges :", 175, finalY + 24, { align: "right" });
  const shippingAmount = data.shippingAmount || 0;
  doc.text(shippingAmount.toFixed(2), 198, finalY + 24, { align: "right" });
  doc.line(130, finalY + 25, 200, finalY + 25);

  const discountAmount = data.discountAmount || 0;
  doc.text("Discount :", 175, finalY + 29, { align: "right" });
  doc.text(discountAmount > 0 ? `-${discountAmount.toFixed(2)}` : "0.00", 198, finalY + 29, { align: "right" });
  doc.line(130, finalY + 30, 200, finalY + 30);

  const shippingGst = Math.round((data.shippingAmount || 0) * 0.18 * 100) / 100;
  doc.text("Shipping GST (18%) :", 175, finalY + 34, { align: "right" });
  doc.text(shippingGst.toFixed(2), 198, finalY + 34, { align: "right" });
  doc.line(130, finalY + 35, 200, finalY + 35);

  const rawTotal = subtotalTaxable + totalCgst + totalSgst + totalIgst + shippingAmount + shippingGst - discountAmount;
  const finalRoundedTotal = data.totalAmount;

  doc.setFillColor(220, 235, 245);
  doc.rect(130, finalY + 35, 70, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount :", 175, finalY + 41, { align: "right" });
  doc.text(finalRoundedTotal.toFixed(2), 198, finalY + 41, { align: "right" });

  // Signature
  doc.setFont("helvetica", "normal");
  doc.text("For, UC ENTERPRISES", 165, finalY + 50, { align: "center" });
  doc.text("Authorised Signatory", 165, finalY + 63, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text("Thank You For Business With US!", 105, finalY + 70, { align: "center" });

  return doc;
};
