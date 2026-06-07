import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { Printer, MapPin, Package, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ShippingLabelPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("id", params.id)
    .single();

  if (error || !order) {
    return notFound();
  }

  const getDisplayOrderId = (id: string, dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `UC-${year}${month}-${id.substring(0, 6).toUpperCase()}`;
  };

  return (
    <div className="min-h-screen bg-zinc-100 p-8 flex flex-col items-center">
      {/* Print Controls (hidden when printing) */}
      <div className="mb-8 flex gap-4 print:hidden w-full max-w-2xl justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
        <div>
          <h2 className="font-bold text-zinc-800">Shipping Label Generator</h2>
          <p className="text-xs text-zinc-500">Order {getDisplayOrderId(order.id, order.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/uc-admin-portal/orders" className="px-4 py-2 text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
            Back to Orders
          </Link>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Label
          </button>
        </div>
      </div>

      {/* Actual Label (Size roughly 4x6 inches for thermal printers) */}
      <div className="w-[4in] h-[6in] bg-white text-black border-2 border-dashed border-zinc-300 print:border-none print:shadow-none shadow-xl flex flex-col overflow-hidden mx-auto relative p-6 box-border print:w-full print:h-full print:m-0 print:p-4">
        
        {/* Label Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">STANDARD</h1>
            <p className="text-xs font-bold mt-1 uppercase tracking-widest">{order.carrier || "Carrier Pending"}</p>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-lg leading-none">UC</h2>
            <p className="text-[10px] uppercase font-semibold text-gray-500">Logistics</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="flex flex-col gap-6 flex-1">
          {/* From */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1">From:</p>
            <div className="text-xs leading-tight">
              <p className="font-bold">Your Store Name</p>
              <p>123 Commerce Way</p>
              <p>Warehouse District, City, 10001</p>
              <p>support@store.com</p>
            </div>
          </div>

          {/* To */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <p className="text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Ship To:
            </p>
            <div className="text-sm leading-snug">
              <p className="font-extrabold text-base mb-1">{order.customer_name}</p>
              <p className="whitespace-pre-wrap">{order.shipping_address || "No Address Provided"}</p>
              <p className="mt-2 font-mono font-bold flex items-center gap-1">
                <Phone className="w-3 h-3" /> {order.phone || "No Phone"}
              </p>
            </div>
          </div>
        </div>

        {/* Order Meta */}
        <div className="border-t-2 border-black pt-4 mt-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500">Order Reference</p>
              <p className="font-mono font-bold text-sm">{getDisplayOrderId(order.id, order.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-gray-500">Weight</p>
              <p className="font-bold text-sm">1.5 kg</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-gray-500">Items</p>
              <p className="font-bold text-sm">{order.order_items?.length || 0}</p>
            </div>
          </div>

          {/* Fake Barcode */}
          <div className="flex flex-col items-center border border-black p-2 bg-gray-50">
            <div className="font-mono text-3xl tracking-[-0.1em] font-black text-black select-none">
              ||| ||||| ||| ||| |||| |||||
            </div>
            <p className="font-mono text-[10px] font-bold tracking-widest mt-1">
              {order.tracking_id || order.id.toUpperCase().substring(0, 12)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:w-full, .print\\:w-full * {
            visibility: visible;
          }
          .print\\:w-full {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: 100% !important;
            border: none !important;
          }
        }
      `}} />
    </div>
  );
}
