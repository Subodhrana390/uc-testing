// No top-level imports for jspdf to avoid bloating the bundle
import { getDisplayOrderId } from "./order";

export interface InvoiceData {
  orderId: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  items: any[];
  totalAmount: number;
}

export const generateInvoicePDF = async (data: InvoiceData) => {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  
  const doc = new jsPDF();
  const businessInfo = {
    name: "UC ENTERPRISES",
    address: "Hadhbast no-44, Ambala Delhi National Highway, Bisanpur, Zirakpur, Punjab, 140603, India.",
    gstin: "03DYEPD4654N1ZB",
    udyam: "UDYAM-PB-18-0013501",
    email: "ucenterprises1@gmail.com",
    phone: "9888863377"
  };

  // Set Header
  doc.setFontSize(22);
  doc.setTextColor(249, 115, 22); // Primary orange color
  doc.text(businessInfo.name, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  
  // Wrap business address text dynamically
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
  doc.text(`Order ID: ${getDisplayOrderId(data.orderId, data.date)}`, 14, 62);
  doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 14, 67);

  // Billing Details
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 120, 55);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerName, 120, 62);
  doc.text(data.customerEmail, 120, 67);
  if (data.customerPhone) doc.text(data.customerPhone, 120, 72);
  
  // Wrap address text
  const splitAddress = doc.splitTextToSize(data.address, 70);
  doc.text(splitAddress, 120, 77);

  // Table
  const tableData = data.items.map((item, index) => {
    const unitPrice = parseFloat(item.unit_price);
    const qty = item.quantity;
    const amount = unitPrice * qty;
    return [
      index + 1,
      item.products?.name || "Product",
      unitPrice.toFixed(2),
      qty,
      amount.toFixed(2)
    ];
  });

  (doc as any).autoTable({
    startY: 100,
    head: [['#', 'Description', 'Unit Price', 'Qty', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
    },
    foot: [[
      { content: 'Total (Incl. Delivery)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `INR ${data.totalAmount.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
    ]]
  });

  // Footer notes
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("1. This is a computer generated invoice and does not require a physical signature.", 14, finalY);
  doc.text("2. Please quote invoice number for all future correspondence.", 14, finalY + 5);
  doc.text("3. Terms & Conditions apply. Thank you for your business!", 14, finalY + 10);

  return doc;
};
