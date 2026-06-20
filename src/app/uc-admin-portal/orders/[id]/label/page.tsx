import { createAdminClient as createClient } from "@/utils/supabase/admin-server";
import { Printer, MapPin, Package, Phone, FileText, CreditCard, AlertTriangle, Truck, Calendar } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDisplayOrderId } from "@/lib/order";

import { PrintButton } from "./PrintButton";

export default async function ShippingLabelPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("id", params.id)
    .single();

  if (error || !order) {
    return notFound();
  }

  // Fetch invoice details
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_id", order.id)
    .maybeSingle();

  const isShipped = order.status?.toUpperCase() === "SHIPPED" || order.status?.toUpperCase() === "DELIVERED";

  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-8 flex flex-col items-center text-[#18181b] font-sans">
      {/* Print Controls (hidden when printing) */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 print:hidden w-full max-w-5xl justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 no-print">
        <div>
          <h2 className="font-extrabold text-zinc-900 text-lg tracking-tight">Label & Invoice Hub</h2>
          <p className="text-xs font-medium text-zinc-500 mt-0.5">Order ID: {getDisplayOrderId(order.id, order.created_at)}</p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/uc-admin-portal/orders" className="px-4 py-2.5 text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-xl transition-all shadow-sm">
            Back to Orders
          </Link>
          <PrintButton order={order} invoice={invoice} />
        </div>
      </div>

      {/* Shipping Warning Alert (hidden when printing) */}
      {!isShipped && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-850 text-xs w-full max-w-5xl print:hidden no-print">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900">Label Status Warning:</span> This order is currently in <span className="font-bold uppercase text-amber-900">{order.status || "Pending"}</span> status. Standard shipping carrier and tracking barcode parameters are fully generated after checking out the shipment as <span className="font-bold">Shipped</span>.
          </div>
        </div>
      )}

      {/* Main Printable Container */}
      <div className="print-area flex flex-col lg:flex-row gap-8 justify-center items-start w-full max-w-5xl print:block print:w-full print:max-w-none">
        
        {/* SECTION 1: Standard Courier Shipping Label */}
        <div className="print-label-thermal w-[4in] h-[6in] bg-white text-black border-2 border-dashed border-zinc-300 shadow-xl flex flex-col overflow-hidden relative p-6 box-border shrink-0 page-break">
          {/* Label Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-3 shrink-0">
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase">STANDARD DELIV</h1>
              <p className="text-[10px] font-black mt-0.5 uppercase tracking-wider text-zinc-700">{order.carrier || "STANDARD CARRIER"}</p>
            </div>
            <div className="text-right">
              <h2 className="font-black text-lg leading-none tracking-tight">UC</h2>
              <p className="text-[9px] uppercase font-bold text-zinc-500">Logistics</p>
            </div>
          </div>

          {/* Address Details */}
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* From */}
            <div className="shrink-0">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">FROM:</p>
              <div className="text-[11px] leading-tight text-zinc-800">
                <p className="font-bold">UC Enterprises Warehouse</p>
                <p>Zirakpur, Punjab, India, 140603</p>
                <p className="font-semibold">Ph: +91 98888 63377</p>
              </div>
            </div>

            {/* To */}
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-lg flex-1 min-h-0 flex flex-col justify-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> SHIP TO:
              </p>
              <div className="text-xs leading-snug">
                <p className="font-black text-sm text-zinc-950">{order.customer_name}</p>
                <p className="font-medium text-zinc-850 whitespace-pre-wrap leading-tight mt-0.5">{order.shipping_address || "No Address Provided"}</p>
                <p className="mt-1.5 font-mono font-bold text-[11px] flex items-center gap-1 text-zinc-900">
                  <Phone className="w-2.5 h-2.5" /> {order.phone || "No Phone"}
                </p>
              </div>
            </div>

            {/* Micro Item Manifest (within label box) */}
            <div className="pt-2 border-t border-zinc-200 shrink-0">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">MANIFEST SUMMARY:</p>
              <div className="text-[9px] space-y-1 max-h-[60px] overflow-hidden">
                {order.order_items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-zinc-800 font-medium">
                    <span className="truncate pr-2">{item.products?.name || "Deleted Product"}</span>
                    <span className="font-mono font-bold shrink-0 bg-zinc-100 px-1 py-0.2 rounded">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Label Footer */}
          <div className="border-t-2 border-black pt-3 mt-auto shrink-0">
            <div className="flex justify-between items-end mb-2 text-xs">
              <div>
                <p className="text-[8px] font-bold uppercase text-zinc-500">Order ID</p>
                <p className="font-mono font-black text-zinc-900">{getDisplayOrderId(order.id, order.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase text-zinc-500">Items</p>
                <p className="font-black text-zinc-900">{order.order_items?.length || 0}</p>
              </div>
            </div>

            {/* Barcode representation */}
            <div className="flex flex-col items-center border border-black p-1.5 bg-zinc-50 rounded">
              <div className="font-mono text-2xl tracking-[-0.12em] font-black text-black select-none leading-none">
                |||| || ||||| ||| || |||| |||||
              </div>
              <p className="font-mono text-[9px] font-bold tracking-widest mt-1 uppercase text-zinc-900">
                {order.tracking_id || order.id.toUpperCase().substring(0, 12)}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Integrated Detailed Invoice / Packing Slip */}
        <div className="print-invoice-a4 w-full lg:w-[7.5in] bg-white text-zinc-800 border border-zinc-200 shadow-xl rounded-3xl p-6 md:p-8 box-border flex flex-col justify-between print:mt-0">
          <div>
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-zinc-200 pb-5 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">OFFICIAL INVOICE</span>
                </div>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-1">
                  {invoice?.invoice_number || `INV-${order.id.slice(0, 8).toUpperCase()}`}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Date: {new Date(invoice?.created_at || order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <h3 className="font-black text-lg text-zinc-900 tracking-tight leading-none">UC ENTERPRISES</h3>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-1">Tax Invoice / Packing Slip</p>
              </div>
            </div>

            {/* Party Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-zinc-200 mb-6">
              {/* Customer Info */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Customer Details
                </p>
                <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-2xl space-y-1">
                  <p className="font-bold text-zinc-900 text-sm">{order.customer_name}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <span>Email:</span> <span className="font-medium text-zinc-700">{order.customer_email || "N/A"}</span>
                  </p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <span>Phone:</span> <span className="font-medium text-zinc-700">{order.phone || "N/A"}</span>
                  </p>
                </div>
              </div>

              {/* Shipping & Payment info */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment & Logistics
                </p>
                <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-2xl space-y-1 text-xs">
                  <p className="text-zinc-500 flex justify-between">
                    <span>Payment Method:</span> <span className="font-bold text-zinc-800">{order.payment_method || "COD"}</span>
                  </p>
                  <p className="text-zinc-500 flex justify-between">
                    <span>Payment Status:</span> 
                    <span className={`font-bold uppercase ${order.payment_status?.toLowerCase() === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                      {order.payment_status || "Unpaid"}
                    </span>
                  </p>
                  {isShipped && (
                    <div className="border-t border-zinc-200/60 pt-1 mt-1 space-y-0.5">
                      <p className="text-zinc-500 flex justify-between">
                        <span>Carrier:</span> <span className="font-semibold text-zinc-700">{order.carrier || "Standard"}</span>
                      </p>
                      <p className="text-zinc-500 flex justify-between">
                        <span>Tracking ID:</span> <span className="font-mono text-zinc-700">{order.tracking_id || "N/A"}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address Block */}
              <div className="md:col-span-2 space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Shipping Address
                </p>
                <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-2xl text-xs text-zinc-700 leading-relaxed font-medium whitespace-pre-wrap">
                  {order.shipping_address || "No shipping address details found."}
                </div>
              </div>
            </div>

            {/* Product details table */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Product Itemized Breakdown</p>
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-250 text-zinc-500 font-bold uppercase text-[10px]">
                      <th className="px-4 py-3">Product details</th>
                      <th className="px-4 py-3 text-center">SKU</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {order.order_items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3.5 text-zinc-900 font-bold max-w-[200px] truncate">{item.products?.name || "Deleted Product"}</td>
                        <td className="px-4 py-3.5 text-center font-mono text-zinc-400 text-[10px]">{item.products?.sku || "N/A"}</td>
                        <td className="px-4 py-3.5 text-right text-zinc-650">₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3.5 text-center text-zinc-700 font-bold">{item.quantity}</td>
                        <td className="px-4 py-3.5 text-right text-zinc-900 font-black">₹{Number(item.quantity * parseFloat(item.unit_price)).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pricing Totals & Signatures */}
          <div className="mt-8 border-t border-zinc-200 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="text-[11px] text-zinc-400 font-medium max-w-sm">
                <p>Thank you for choosing UC Enterprises. For any queries regarding this package, please contact logistics support at support@ucenterprises.com.</p>
              </div>

              {/* Total calculations */}
              <div className="w-full sm:w-64 space-y-2 text-xs font-semibold text-zinc-500">
                {(() => {
                  const grossSubtotal = order.order_items?.reduce((acc: number, item: any) => acc + (item.quantity * parseFloat(item.unit_price)), 0) || 0;
                  const cgstAmt = parseFloat(order.cgst_amount || 0);
                  const sgstAmt = parseFloat(order.sgst_amount || 0);
                  const igstAmt = parseFloat(order.igst_amount || 0);
                  const isSplit = (cgstAmt + sgstAmt + igstAmt) > 0;
                  const taxAmount = isSplit ? (cgstAmt + sgstAmt + igstAmt) : parseFloat(order.tax_amount || 0);
                  const subtotalExcl = grossSubtotal - taxAmount;

                  return (
                    <>
                      {taxAmount > 0 ? (
                        <>
                          <div className="flex justify-between">
                            <span>Subtotal (Excl. GST):</span>
                            <span className="text-zinc-800">
                              ₹{subtotalExcl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {isSplit ? (
                            <>
                              {cgstAmt > 0 && (
                                <div className="flex justify-between text-zinc-600">
                                  <span>CGST:</span>
                                  <span className="text-zinc-800">₹{cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {sgstAmt > 0 && (
                                <div className="flex justify-between text-zinc-600">
                                  <span>SGST:</span>
                                  <span className="text-zinc-800">₹{sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {igstAmt > 0 && (
                                <div className="flex justify-between text-zinc-600">
                                  <span>IGST:</span>
                                  <span className="text-zinc-800">₹{igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex justify-between">
                              <span>GST (Tax):</span>
                              <span className="text-zinc-800">
                                ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="text-zinc-800">
                            ₹{grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="flex justify-between">
                  <span>Shipping Fee:</span>
                  {parseFloat(order.shipping_amount || 0) > 0 ? (
                    <span className="text-zinc-800">
                      ₹{parseFloat(order.shipping_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  )}
                </div>
                {parseFloat(order.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Coupon Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}:</span>
                    <span className="font-bold">
                      -₹{parseFloat(order.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-150 pt-2 text-sm font-black text-zinc-900">
                  <span>Grand Total:</span>
                  <span>₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
          }
          .print-label-thermal {
            width: 4in !important;
            height: 6in !important;
            border: 2px solid black !important;
            margin: 0 auto 30px auto !important;
            page-break-after: always;
            break-after: page;
          }
          .print-invoice-a4 {
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 20px 0 !important;
            margin: 0 !important;
            page-break-before: always;
            break-before: page;
          }
        }
      `}} />
    </div>
  );
}
