import { getDisplayOrderId } from "./order";

interface GeneratePDFParams {
  order: any;
  invoice: any;
}

export const generateShippingLabelAndInvoicePDF = async ({ order, invoice }: GeneratePDFParams) => {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  // Create document with Page 1 as 4x6 inches (101.6 mm x 152.4 mm) for the shipping label
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [101.6, 152.4],
  });

  // ==========================================
  // PAGE 1: SHIPPING LABEL (4x6 thermal format)
  // ==========================================
  
  // Set font
  doc.setFont("helvetica", "normal");

  // Draw dashed border around label
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(3, 3, 95.6, 146.4);
  doc.setLineDashPattern([], 0); // Reset dash pattern

  // Header Section
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  
  // Left Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("STANDARD DELIV", 6, 11);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text((order.carrier || "STANDARD CARRIER").toUpperCase(), 6, 15);

  // Right Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("UC", 95, 11, { align: "right" });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Logistics", 95, 15, { align: "right" });

  // Divider 1
  doc.line(3, 18, 98.6, 18);

  // FROM Address
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text("FROM:", 6, 22);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text("UC Enterprises Warehouse", 6, 26);
  doc.text("Zirakpur, Punjab, India, 140603", 6, 30);
  doc.setFont("helvetica", "bold");
  doc.text("Ph: +91 98888 63377", 6, 34);

  // Divider 2
  doc.setLineWidth(0.4);
  doc.line(3, 38, 98.6, 38);

  // SHIP TO Address Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text("SHIP TO:", 6, 42);

  // Draw light grey box for SHIP TO
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(5, 45, 91.6, 38, "FD");

  // Content inside SHIP TO box
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(order.customer_name || "Guest Customer", 8, 51);

  // Wrapped Shipping Address
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // slate-700
  const shipAddrLines = doc.splitTextToSize(order.shipping_address || "No Address Provided", 85);
  doc.text(shipAddrLines, 8, 56);

  // Phone inside box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Phone: ${order.phone || "N/A"}`, 8, 79);

  // Divider 3
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(3, 86, 98.6, 86);

  // Manifest Summary Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text("MANIFEST SUMMARY:", 6, 90);

  let currentY = 94;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  const maxItemsToShow = 3;
  const items = order.order_items || [];
  
  items.slice(0, maxItemsToShow).forEach((item: any) => {
    const productName = item.products?.name || "Deleted Product";
    const truncatedName = productName.length > 36 ? productName.substring(0, 34) + "..." : productName;
    doc.text(truncatedName, 6, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(`Qty: ${item.quantity}`, 95, currentY, { align: "right" });
    doc.setFont("helvetica", "normal");
    currentY += 4.5;
  });

  if (items.length > maxItemsToShow) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(`+ ${items.length - maxItemsToShow} more items...`, 6, currentY);
  }

  // Divider 4 (above barcode / footer)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(3, 116, 98.6, 116);

  // Footer text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text("ORDER ID", 6, 120);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(getDisplayOrderId(order.id, order.created_at), 6, 124);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text("ITEMS", 95, 120, { align: "right" });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(String(items.length), 95, 124, { align: "right" });

  // Draw barcode lines
  const barcodeY = 127;
  const barcodeXStart = 15;
  const barcodeHeight = 13;
  doc.setFillColor(0, 0, 0);
  
  // Custom barcode line width pattern
  const barcodePattern = [2, 1, 3, 1, 1, 2, 4, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 4, 2, 1, 2, 1, 3];
  let currentX = barcodeXStart;
  barcodePattern.forEach((w, idx) => {
    if (idx % 2 === 0) {
      doc.rect(currentX, barcodeY, w * 0.8, barcodeHeight, "F");
    }
    currentX += w * 0.8 + 0.6;
  });

  // Tracking ID text centered under barcode
  const trackingText = order.tracking_id || order.id.toUpperCase().substring(0, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(trackingText, 50.8, 145, { align: "center" });


  // ==========================================
  // PAGE 2: TAX INVOICE (A4 format)
  // ==========================================
  
  doc.addPage("a4", "portrait");

  // Page 2 margins: X: 15mm, Y: 15mm
  const a4MarginX = 15;
  
  // Business Header (UC ENTERPRISES)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Sleek modern blue: RGB(37, 99, 235)
  doc.text("UC ENTERPRISES", a4MarginX, 25);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text("TAX INVOICE / PACKING SLIP", a4MarginX, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  const busAddressLines = doc.splitTextToSize("Hadhbast no-44, Ambala Delhi National Highway, Bisanpur, Zirakpur, Punjab, 140603, India.", 100);
  doc.text(busAddressLines, a4MarginX, 35);
  
  const headerDetailsY = 35 + (busAddressLines.length * 4);
  doc.text("GSTIN: 03DYEPD4654N1ZB | UDYAM: UDYAM-PB-18-0013501", a4MarginX, headerDetailsY);
  doc.text("Email: ucenterprises1@gmail.com | Phone: +91 98888 63377", a4MarginX, headerDetailsY + 4);

  // Invoice Meta Info (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  const invoiceNum = invoice?.invoice_number || `INV-${order.id.slice(0, 8).toUpperCase()}`;
  doc.text(invoiceNum, 195, 25, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  const invoiceDateStr = new Date(invoice?.created_at || order.created_at).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.text(`Date: ${invoiceDateStr}`, 195, 30, { align: "right" });
  doc.text(`Order ID: ${getDisplayOrderId(order.id, order.created_at)}`, 195, 34, { align: "right" });

  // Sleek Blue Separator Line
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(a4MarginX, 55, 195, 55);

  // Address Details Box Columns
  const detailsY = 63;
  
  // Left Column: Customer details (Bill To)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("BILL TO:", a4MarginX, detailsY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(order.customer_name || "Guest Customer", a4MarginX, detailsY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Email: ${order.customer_email || "N/A"}`, a4MarginX, detailsY + 9);
  doc.text(`Phone: ${order.phone || "N/A"}`, a4MarginX, detailsY + 13);
  
  // Wrapped Customer Shipping Address
  const custAddressLines = doc.splitTextToSize(order.shipping_address || "No Address Provided", 80);
  doc.text(custAddressLines, a4MarginX, detailsY + 18);

  // Right Column: Payment & Logistics
  const rightColX = 115;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("PAYMENT & LOGISTICS:", rightColX, detailsY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method:", rightColX, detailsY + 5);
  doc.setFont("helvetica", "normal");
  doc.text(order.payment_method || "COD", rightColX + 28, detailsY + 5);

  doc.setFont("helvetica", "bold");
  doc.text("Payment Status:", rightColX, detailsY + 9);
  doc.setFont("helvetica", "bold");
  const isPaid = order.payment_status?.toLowerCase() === "paid";
  if (isPaid) {
    doc.setTextColor(16, 185, 129); // emerald-600
  } else {
    doc.setTextColor(217, 119, 6); // amber-600
  }
  doc.text((order.payment_status || "Unpaid").toUpperCase(), rightColX + 28, detailsY + 9);
  doc.setTextColor(71, 85, 105); // reset

  doc.setFont("helvetica", "bold");
  doc.text("Shipping Carrier:", rightColX, detailsY + 13);
  doc.setFont("helvetica", "normal");
  doc.text(order.carrier || "Standard Courier", rightColX + 28, detailsY + 13);

  doc.setFont("helvetica", "bold");
  doc.text("Tracking ID:", rightColX, detailsY + 17);
  doc.setFont("helvetica", "normal");
  doc.text(order.tracking_id || "Pending Shipment", rightColX + 28, detailsY + 17);

  // Table of Items (A4 size)
  const tableData = items.map((item: any, index: number) => {
    const unitPrice = parseFloat(item.unit_price || 0);
    const qty = item.quantity || 0;
    const amount = unitPrice * qty;
    return [
      index + 1,
      item.products?.name || "Deleted Product",
      item.products?.sku || "N/A",
      `INR ${unitPrice.toLocaleString('en-IN')}`,
      qty,
      `INR ${amount.toLocaleString('en-IN')}`
    ];
  });

  const subtotal = items.reduce((acc: number, item: any) => acc + ((item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);

  // Render Table using autoTable
  (doc as any).autoTable({
    startY: detailsY + 32,
    head: [['#', 'Description', 'SKU', 'Unit Price', 'Qty', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
    },
    foot: [
      [
        { content: 'Subtotal', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `INR ${subtotal.toLocaleString('en-IN')}`, styles: { halign: 'right', fontStyle: 'bold' } }
      ],
      [
        { content: 'Shipping Fee', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'FREE', styles: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] } }
      ],
      [
        { content: 'Grand Total', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
        { content: `INR ${Number(order.total_amount).toLocaleString('en-IN')}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, textColor: [37, 99, 235] } }
      ]
    ],
    margin: { left: a4MarginX, right: a4MarginX }
  });

  // Footer notes at the bottom of the page
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont("helvetica", "normal");
  doc.text("1. This is a computer generated invoice and does not require a physical signature.", a4MarginX, finalY);
  doc.text("2. Please contact support@ucenterprises.com for queries regarding this shipment.", a4MarginX, finalY + 4);
  doc.text("3. Terms & Conditions apply. Thank you for choosing UC Enterprises!", a4MarginX, finalY + 8);

  return doc;
};
