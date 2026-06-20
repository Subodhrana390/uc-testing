"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackageSearch, Search, Loader2, Package, CheckCircle2,
  Truck, MapPin, ReceiptText, ArrowRight, RotateCcw,
  AlertCircle, HelpCircle, FileDown, Star, ShieldCheck,
  BadgeCheck, Clock3, XCircle, RefreshCcw,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { getDisplayOrderId } from "@/lib/order";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { trackOrder } from "@/app/actions/orders";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ─────────────────────────── helpers ─────────────────────────── */
function getStatusStep(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return 0;
  if (s === "confirmed") return 1;
  if (s === "processing") return 2;
  if (s === "shipped") return 3;
  if (s === "delivered") return 4;
  if ([
    "return_requested",
    "return_approved",
    "returned",
    "refund_pending",
    "refunded",
    "replacement_requested",
    "replacement_approved",
    "replaced"
  ].includes(s)) {
    return 5;
  }
  return -1;
}

function getReturnStatusStep(status: string) {
  const s = status.toLowerCase();
  if (s === "return_requested") return 0;
  if (s === "return_approved") return 1;
  if (s === "returned") return 2;
  if (s === "refund_pending") return 3;
  if (s === "refunded") return 4;
  return -1;
}

function getReplacementStatusStep(status: string) {
  const s = status.toLowerCase();
  if (s === "replacement_requested") return 0;
  if (s === "replacement_approved") return 1;
  if (s === "replaced") return 2;
  return -1;
}

function getTrackingUrl(carrier: string, trackingId: string) {
  if (!trackingId) return "";
  const c = (carrier || "").toLowerCase();
  const awb = encodeURIComponent(trackingId.trim());
  if (c.includes("delhivery")) {
    return `https://www.delhivery.com/tracking/package-tracking/${awb}`;
  }
  if (c.includes("bluedart") || c.includes("blue dart")) {
    return `https://www.bluedart.com/web/guest/track-shipment-rt?trackables=${awb}`;
  }
  if (c.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${awb}`;
  }
  if (c.includes("dhl")) {
    return `https://www.dhl.com/in-en/home/tracking/tracking-express.html?submit=1&tracking-id=${awb}`;
  }
  if (c.includes("dtdc")) {
    return `https://www.dtdc.in/tracking/shipment-tracking.html?strConsignmentNo=${awb}`;
  }
  if (c.includes("ekart")) {
    return `https://ekartlogistics.com/shipment/${awb}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + " tracking " + trackingId)}`;
}

function getShipmentStatusTheme(status: string) {
  const s = (status || "").toUpperCase();
  if (["DELIVERED", "RETURN_RECEIVED"].includes(s)) {
    return {
      bg: "bg-emerald-50/70 border-emerald-100",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-500",
    };
  }
  if (["IN_TRANSIT", "RETURN_IN_TRANSIT"].includes(s)) {
    return {
      bg: "bg-indigo-50/70 border-indigo-100",
      text: "text-indigo-700",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
      iconBg: "bg-indigo-500",
    };
  }
  if (["OUT_FOR_DELIVERY", "PICKED_UP"].includes(s)) {
    return {
      bg: "bg-amber-50/70 border-amber-100",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      iconBg: "bg-amber-500",
    };
  }
  return {
    bg: "bg-slate-50/70 border-slate-100",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    iconBg: "bg-zinc-500",
  };
}

function fmtDate(iso: string, hoursToAdd = 0) {
  const d = new Date(iso);
  d.setHours(d.getHours() + hoursToAdd);
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function statusColor(s: string) {
  const sl = s.toLowerCase();
  if (sl === "delivered" || sl === "refunded") return "emerald";
  if (sl === "shipped") return "indigo";
  if (sl === "processing") return "blue";
  if (sl === "confirmed" || sl === "pending" || sl === "placed" || sl === "order_confirmed") return "amber";
  if (sl === "cancelled" || sl === "failed") return "red";
  if (sl === "return_requested") return "pink";
  if (sl === "return_approved" || sl === "returned") return "rose";
  if (sl === "refund_pending") return "orange";
  if (sl === "replacement_requested") return "amber";
  if (sl === "replacement_approved") return "blue";
  if (sl === "replaced") return "emerald";
  return "zinc";
}

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  zinc: "bg-zinc-50 text-zinc-700 border-zinc-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
  failed: "Failed", returned: "Returned", return_requested: "Return Requested",
  return_approved: "Return Approved", refund_pending: "Refund Pending", refunded: "Refunded",
  replacement_requested: "Replacement Requested",
  replacement_approved: "Replacement Approved",
  replaced: "Replaced",
};

/* ─────────────────────────── component ─────────────────────────── */
function TrackOrderContent() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(false);

  const [reviewProduct, setReviewProduct] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());

  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  /* invoice download */
  const handleDownloadInvoice = async (o: any) => {
    try {
      const { generateInvoicePDF } = await import("@/lib/invoice");
      const doc = await generateInvoicePDF({
        orderId: o.id, date: o.created_at,
        customerName: o.customer_name, customerEmail: o.customer_email,
        customerPhone: o.phone, address: o.shipping_address || "N/A",
        items: o.order_items || [], totalAmount: parseFloat(o.total_amount),
        taxAmount: parseFloat(o.tax_amount || 0),
        shippingAmount: parseFloat(o.shipping_amount || 0),
        discountAmount: parseFloat(o.discount_amount || 0),
      });
      doc.save(`Invoice_${getDisplayOrderId(o.id, o.created_at)}.pdf`);
      toast.success("Invoice downloaded!");
    } catch { toast.error("Failed to download invoice."); }
  };

  /* review */
  const handleSubmitReview = async () => {
    if (!reviewText.trim()) { toast.error("Please enter your review."); return; }
    setReviewSubmitting(true);
    try {
      if (!user) { toast.error("Please login."); setIsReviewOpen(false); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const reviewerName = profile?.full_name || user.user_metadata?.full_name || user.email || "Customer";
      const { error } = await supabase.from("product_reviews").insert([{
        product_id: reviewProduct.id, user_id: user.id,
        reviewer_name: reviewerName, rating: reviewRating, review: reviewText,
      }]);
      if (error) throw error;
      toast.success("Review submitted!");
      setReviewedProductIds((prev) => {
        const next = new Set(prev);
        next.add(reviewProduct.id);
        return next;
      });
      setIsReviewOpen(false);
    } catch (e: any) { toast.error(e.message || "Failed to submit review."); }
    finally { setReviewSubmitting(false); }
  };

  const performTracking = async (id: string) => {
    setLoading(true); setError(""); setOrder(null);
    try {
      const trimmedId = id.trim();
      const res = await trackOrder(trimmedId);
      if (res.success && res.order) {
        setOrder(res.order);
      } else {
        setError(res.error || "We couldn't find an order with that ID.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* realtime */
  useEffect(() => {
    if (!order?.id) return;
    const ch = supabase.channel(`order-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (payload) => setOrder((prev: any) => ({ ...prev, ...payload.new, order_items: prev?.order_items, payments: prev?.payments })))
      .subscribe((s) => setIsLive(s === "SUBSCRIBED"));
    return () => { supabase.removeChannel(ch); setIsLive(false); };
  }, [order?.id, supabase]);

  useEffect(() => {
    const id = searchParams.get("orderId");
    if (id) { setOrderId(id); performTracking(id); }
  }, [searchParams]);

  useEffect(() => {
    async function fetchUserReviews() {
      if (user) {
        const { data } = await supabase
          .from("product_reviews")
          .select("product_id")
          .eq("user_id", user.id);
        if (data) {
          setReviewedProductIds(new Set(data.map((r: any) => r.product_id)));
        }
      }
    }
    if (isAuthInitialized) {
      fetchUserReviews();
    }
  }, [supabase, user, isAuthInitialized]);

  /* ── timeline steps ── */
  const sl = (order?.status || "").toLowerCase();
  const STEPS = [
    { key: "pending", label: "Order Placed", desc: "Order received, pending payment or verification.", Icon: Clock3 },
    { key: "confirmed", label: "Order Confirmed", desc: "Payment received and order verified.", Icon: BadgeCheck },
    { key: "processing", label: "Processing", desc: "Items picked, inspected and packed.", Icon: Package },
    { key: "shipped", label: "Shipped", desc: "Package handed to delivery partner.", Icon: Truck },
    { key: "delivered", label: "Delivered", desc: "Package received successfully.", Icon: ShieldCheck },
  ];


  const step = getStatusStep(sl);
  const isTerminal = step === -1;
  const col = statusColor(sl);
  const shipment = useMemo(() => {
    if (!order?.shipments) return null;
    const list = Array.isArray(order.shipments) ? order.shipments : [order.shipments];
    if (list.length === 0) return null;

    const isReverseStatus = [
      "return_requested", "return_approved", "returned", "refund_pending", "refunded",
      "replacement_requested", "replacement_approved", "replaced"
    ].includes(sl);

    if (isReverseStatus) {
      const reverseShipment = list.find((s: any) =>
        ["PICKUP_SCHEDULED", "PICKED_UP", "RETURN_IN_TRANSIT", "RETURN_RECEIVED"].includes(s.status.toUpperCase())
      );
      if (reverseShipment) return reverseShipment;
    }

    return list[0];
  }, [order?.shipments, sl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-24">

      {/* ── Hero header ── */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Shipment Tracker</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-950">Track Your Order</h1>
            <p className="text-zinc-500 text-sm mt-1 max-w-md">Enter your Order ID (starting with OD) for real-time shipment status.</p>
          </div>
          <Link href="/account/orders">
            <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-950 transition-colors border border-zinc-200 rounded-xl px-4 py-2.5 bg-white hover:bg-zinc-50">
              <ReceiptText className="w-4 h-4" /> View All Orders
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-12 items-start">

          {/* ── Search sidebar ── */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">

            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shrink-0">
                  <PackageSearch className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Locate Shipment</p>
                  <p className="text-[10px] text-zinc-400 font-medium">Real-time tracking</p>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); performTracking(orderId); }} className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <Input
                    placeholder="e.g. OD177840830..."
                    className="pl-9 h-11 rounded-xl border-zinc-200 text-sm font-bold bg-zinc-50 focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950 placeholder:font-normal placeholder:text-zinc-400"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-zinc-950 hover:bg-zinc-800 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Tracking...</> : <><PackageSearch className="w-3.5 h-3.5" /> Track Order</>}
                </button>
              </form>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-4 p-3.5 bg-red-50 text-red-700 rounded-xl text-xs flex items-start gap-2.5 border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* help tip */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                Your Order ID is in the confirmation email sent after placing the order. It starts with <strong>OD</strong>.
              </p>
            </div>
          </div>

          {/* ── Results column ── */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {order ? (
                <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">

                  {/* ── Order header card ── */}
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    {/* top band */}
                    <div className={cn("px-6 py-3 flex items-center justify-between", COLOR_MAP[col])}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {STATUS_LABEL[sl] ?? order.status.replace(/_/g, " ")}
                        </span>
                        {isLive && (
                          <span className="ml-2 text-[9px] font-black uppercase tracking-widest bg-white/60 px-2 py-0.5 rounded-full border border-current/20">
                            Live
                          </span>
                        )}
                      </div>
                      <button onClick={() => { setOrderId(""); setOrder(null); }}
                        className="w-7 h-7 rounded-lg hover:bg-black/10 flex items-center justify-center text-current/60 hover:text-current transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-zinc-100">
                      {[
                        { label: "Order ID", value: getDisplayOrderId(order.id, order.created_at) },
                        { label: "Placed On", value: new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
                        { label: "Total", value: `₹${parseFloat(order.total_amount).toLocaleString("en-IN")}` },
                        { label: "Payment", value: order.payment_status || "Unpaid" },
                        { label: "Payment Method", value: order.payment_method || "Unpaid" },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm font-bold text-zinc-900 mt-0.5 truncate">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="md:col-span-2 shadow-sm p-5">
                      <div className="flex items-center gap-2 mb-4 pb-3">
                        <ReceiptText className="w-4 h-4 text-zinc-400" />
                        <h4 className="text-sm font-bold text-zinc-900">Order Items</h4>
                        <span className="ml-auto text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                          {order.order_items?.length ?? 0}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 relative">
                              {item.products?.image_url
                                ? <Image src={item.products.image_url} alt={item.products.name} fill sizes="48px" className="object-contain p-1" />
                                : <Package className="w-5 h-5 text-zinc-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-900 truncate">{item.products?.name}</p>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                Qty: <span className="text-zinc-700 font-bold">{item.quantity}</span>
                                {item.unit_price && <span className="ml-2">· ₹{parseFloat(item.unit_price).toLocaleString("en-IN")} each</span>}
                              </p>
                            </div>
                            {order.status?.toLowerCase() === "delivered" && item.products && (
                              reviewedProductIds.has(item.products.id) ? (
                                <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Reviewed
                                </span>
                              ) : (
                                <button
                                  onClick={() => { setReviewProduct(item.products); setReviewRating(5); setReviewText(""); setIsReviewOpen(true); }}
                                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
                                >
                                  <Star className="w-3 h-3" /> Review
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100">
                      {order.shipping_address && (
                        <div className="flex items-start gap-3 flex-1">
                          <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
                              Shipping To
                            </p>
                            <div className="text-xs text-zinc-700 whitespace-pre-wrap">
                              <p className="font-bold text-zinc-900 mb-0.5">{order.customer_name}</p>
                              <p className="font-medium leading-relaxed">{order.shipping_address}</p>
                              {order.phone && (
                                <p className="font-semibold text-zinc-900 mt-1 flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-zinc-400" /> {order.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {order.status?.toLowerCase() === "delivered" ? (
                        <button
                          onClick={() => handleDownloadInvoice(order)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider group"
                        >
                          Download Invoice
                          <FileDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                        </button>
                      ) : (
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border border-dashed border-white/10 rounded-xl px-3 py-2 whitespace-nowrap">
                          Invoice after delivery
                        </p>
                      )}
                    </div>

                    {/* carrier */}
                    {(order.tracking_id || shipment?.awb) && (
                      (() => {
                        const carrier = shipment?.carrier || order.carrier || "Delivery Partner";
                        const trackingId = shipment?.awb || order.tracking_id;
                        const trackingUrl = getTrackingUrl(carrier, trackingId);
                        const shipStatus = shipment?.status || "IN_TRANSIT";
                        const theme = getShipmentStatusTheme(shipStatus);

                        return (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "px-6 py-4 flex items-center justify-between gap-4 border-t transition-colors hover:bg-zinc-50/80 group",
                              theme.bg
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-105", theme.iconBg)}>
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", theme.text)}>
                                  {carrier}
                                  <span className="text-[9px] font-normal lowercase text-zinc-400 group-hover:underline">(click to track)</span>
                                </p>
                                <p className="text-xs font-bold text-zinc-900 font-mono mt-0.5">{trackingId}</p>
                              </div>
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", theme.badge)}>
                              {shipStatus.replace(/_/g, " ")}
                            </span>
                          </a>
                        );
                      })()
                    )}
                  </div>

                  {/* ── Visual Timeline card ── */}
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Clock3 className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-sm font-bold text-zinc-900">Order Progress</h3>
                    </div>

                    {!isTerminal ? (
                      <div className="relative">
                        {STEPS.map((st, idx) => {
                          const isDone = step > idx;
                          const isCurrent = step === idx;
                          const isPending = step < idx;
                          const { Icon } = st;
                          const isLast = idx === STEPS.length - 1;
                          const stepCol = statusColor(st.key);

                          return (
                            <div key={st.key} className="flex gap-4">
                              {/* ─ left column: dot + line ─ */}
                              <div className="flex flex-col items-center w-10 shrink-0">
                                <motion.div
                                  initial={false}
                                  animate={isCurrent ? { scale: [1, 1.12, 1] } : {}}
                                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 shrink-0",
                                    isDone && "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100",
                                    isCurrent && cn(
                                      "text-white shadow-lg ring-4",
                                      stepCol === "emerald" && "bg-emerald-500 border-emerald-500 ring-emerald-500/10",
                                      stepCol === "indigo" && "bg-indigo-500 border-indigo-500 ring-indigo-500/10",
                                      stepCol === "blue" && "bg-blue-500 border-blue-500 ring-blue-500/10",
                                      stepCol === "amber" && "bg-amber-500 border-amber-500 ring-amber-500/10",
                                      stepCol === "red" && "bg-red-500 border-red-500 ring-red-500/10",
                                      stepCol === "pink" && "bg-pink-500 border-pink-500 ring-pink-500/10",
                                      stepCol === "rose" && "bg-rose-500 border-rose-500 ring-rose-500/10",
                                      stepCol === "orange" && "bg-orange-500 border-orange-500 ring-orange-500/10",
                                      stepCol === "zinc" && "bg-zinc-950 border-zinc-950 ring-zinc-900/10"
                                    ),
                                    isPending && "bg-white border-zinc-200 text-zinc-300"
                                  )}
                                >
                                  {isDone
                                    ? <CheckCircle2 className="w-5 h-5" />
                                    : <Icon className="w-4.5 h-4.5" />}
                                </motion.div>
                                {!isLast && (
                                  <div className="relative w-0.5 flex-1 my-1 overflow-hidden rounded-full bg-zinc-100" style={{ minHeight: "2.5rem" }}>
                                    <motion.div
                                      className="absolute inset-x-0 top-0 bg-emerald-400 rounded-full"
                                      initial={{ height: "0%" }}
                                      animate={{ height: isDone ? "100%" : "0%" }}
                                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* ─ right column: content ─ */}
                              <div className={cn("pb-7 pt-1.5 flex-1 min-w-0", isLast && "pb-0")}>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={cn(
                                    "text-sm font-bold",
                                    isDone && "text-emerald-700",
                                    isCurrent && "text-zinc-950",
                                    isPending && "text-zinc-300"
                                  )}>
                                    {st.label}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-950 text-white px-2 py-0.5 rounded-full animate-pulse">
                                      Current
                                    </span>
                                  )}
                                  {isDone && (
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                      ✓ Done
                                    </span>
                                  )}
                                </div>

                                <p className={cn("text-xs leading-relaxed", isPending ? "text-zinc-300" : "text-zinc-500")}>
                                  {idx === 2 && order.carrier ? `Handed to ${order.carrier}. In transit.` : st.desc}
                                </p>

                                {(isDone || isCurrent) && (
                                  <p className="text-[10px] font-mono text-zinc-400 mt-1.5">
                                    {idx === 0
                                      ? fmtDate(order.created_at)
                                      : isCurrent
                                        ? fmtDate(order.updated_at || order.created_at)
                                        : fmtDate(order.created_at, [0, 2, 8, 24, 48, 52, 56, 60, 64, 72][idx])}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* terminal statuses */
                      <div className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border",
                        ["cancelled", "failed"].includes(sl) && "bg-red-50 border-red-200",
                        ["returned", "return_requested", "return_approved"].includes(sl) && "bg-amber-50 border-amber-200",
                        ["refund_pending", "refunded"].includes(sl) && "bg-violet-50 border-violet-200",
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0",
                          ["cancelled", "failed"].includes(sl) && "bg-red-100 border-red-300 text-red-600",
                          ["returned", "return_requested", "return_approved"].includes(sl) && "bg-amber-100 border-amber-300 text-amber-600",
                          ["refund_pending", "refunded"].includes(sl) && "bg-violet-100 border-violet-300 text-violet-600",
                        )}>
                          {["cancelled", "failed"].includes(sl) ? <XCircle className="w-5 h-5" />
                            : ["refund_pending", "refunded"].includes(sl) ? <RefreshCcw className="w-5 h-5" />
                              : <RotateCcw className="w-5 h-5" />}
                        </div>
                        <div className="pt-0.5">
                          <p className="text-sm font-bold text-zinc-900 capitalize">
                            {STATUS_LABEL[sl] ?? order.status.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {sl === "cancelled" && "This order has been cancelled and will not be processed."}
                            {sl === "failed" && "The order or payment has failed."}
                            {sl === "returned" && "Order returned to our warehouse."}
                            {sl === "return_requested" && "Return request received. We'll review it shortly."}
                            {sl === "return_approved" && "Return approved. Please ship the item back."}
                            {sl === "refund_pending" && "Refund is being processed."}
                            {sl === "refunded" && "Refund has been completed."}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-400 mt-1.5">
                            {fmtDate(order.updated_at || order.created_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Shipment/Courier Tracker */}
                  {shipment && (
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mt-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-indigo-600 animate-bounce" />
                          <div>
                            <h3 className="text-sm font-black text-zinc-900">Live Courier Tracking</h3>
                            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Carrier Status journey</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-600 font-mono bg-zinc-50 border border-zinc-200 px-3 py-1 rounded-xl">
                          {shipment.carrier?.toUpperCase()}: {shipment.awb}
                        </span>
                      </div>

                      {/* Shipment Journey Timeline */}
                      <div className="relative pl-6 border-l-2 border-zinc-100 space-y-6 my-4 ml-2">
                        {(() => {
                          const currentStatus = shipment.status.toUpperCase();
                          const isOutbound = !["PICKUP_SCHEDULED", "PICKED_UP", "RETURN_IN_TRANSIT", "RETURN_RECEIVED"].includes(currentStatus);

                          const milestones = isOutbound ? [
                            { key: "LABEL_CREATED", label: "Label Created", desc: "Shipping label generated, waiting for pickup." },
                            { key: "IN_TRANSIT", label: "In Transit", desc: "Package has been picked up by courier." },
                            { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "Package is out with local courier agent." },
                            { key: "DELIVERED", label: "Delivered", desc: "Shipment delivered successfully." }
                          ] : [
                            { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled", desc: "Reverse pickup scheduled at shipping address." },
                            { key: "PICKED_UP", label: "Picked Up", desc: "Package picked up by courier partner." },
                            { key: "RETURN_IN_TRANSIT", label: "In Transit", desc: "Return shipment is in transit to warehouse." },
                            { key: "RETURN_RECEIVED", label: "Returned to Warehouse", desc: "Package received at warehouse, processing refund/replacement." }
                          ];

                          // Find current step index
                          let stepIdx = milestones.findIndex(m => m.key === currentStatus);
                          if (stepIdx === -1) {
                            if (currentStatus === "PICKED_UP") stepIdx = 1;
                            else if (currentStatus === "IN_TRANSIT") stepIdx = 1;
                            else if (currentStatus === "DELIVERED") stepIdx = 3;
                            else if (currentStatus === "RETURN_RECEIVED") stepIdx = 3;
                            else stepIdx = 0;
                          }

                          return milestones.map((m, idx) => {
                            const isDone = idx < stepIdx;
                            const isCurrent = idx === stepIdx;
                            const isPending = idx > stepIdx;

                            return (
                              <div key={m.key} className="relative">
                                {/* timeline point */}
                                <div className={cn(
                                  "absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all z-10",
                                  isDone && "border-emerald-500 bg-emerald-500",
                                  isCurrent && "border-indigo-600 bg-indigo-600 animate-pulse",
                                  isPending && "border-zinc-200"
                                )} />

                                <div>
                                  <p className={cn(
                                    "text-xs font-bold",
                                    isDone && "text-emerald-700",
                                    isCurrent && "text-zinc-950 font-black",
                                    isPending && "text-zinc-400"
                                  )}>
                                    {m.label}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                                    {m.desc}
                                  </p>
                                  {isCurrent && (
                                    <p className="text-[9px] font-mono text-zinc-400 mt-1">
                                      Last updated: {new Date(shipment.updated_at).toLocaleString("en-IN")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* ── Replacement Progress Timeline card ── */}
                  {order.return_tracking_id && ["replacement_requested", "replacement_approved", "replaced"].includes(sl) && (
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mt-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-indigo-500" />
                          <h3 className="text-sm font-bold text-zinc-900">Replacement Progress</h3>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full animate-pulse">
                          Reverse Logistics
                        </span>
                      </div>

                      {/* Replacement Logistics Carrier and Tracking ID */}
                      {(() => {
                        const carrier = order.return_carrier || "Reverse Logistics Partner";
                        const trackingId = order.return_tracking_id;
                        const trackingUrl = getTrackingUrl(carrier, trackingId);
                        const shipStatus = shipment?.status || "PICKUP_SCHEDULED";
                        const theme = getShipmentStatusTheme(shipStatus);

                        return (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "p-4 rounded-xl border flex flex-col sm:flex-row justify-between gap-4 mb-6 hover:bg-zinc-50/80 transition-colors group",
                              theme.bg
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-105", theme.iconBg)}>
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", theme.text)}>
                                  {carrier}
                                  <span className="text-[9px] font-normal lowercase text-zinc-400 group-hover:underline">(click to track)</span>
                                </p>
                                <p className="text-xs font-bold text-zinc-900 font-mono mt-0.5">
                                  {trackingId}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center sm:text-right">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Replacement Status</p>
                              <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border mt-0.5 inline-block text-center", theme.badge)}>
                                {shipStatus.replace(/_/g, " ")}
                              </span>
                            </div>
                          </a>
                        );
                      })()}

                      {/* Visual Timeline of Replacement Stages */}
                      <div className="relative">
                        {(() => {
                          const repStep = getReplacementStatusStep(sl);
                          const REP_STEPS = [
                            { key: "replacement_requested", label: "Replacement Requested", desc: "Replacement request received. We'll review it shortly.", Icon: RotateCcw },
                            { key: "replacement_approved", label: "Replacement Approved", desc: "Replacement approved. We have scheduled a reverse pickup.", Icon: BadgeCheck },
                            { key: "replaced", label: "Replaced", desc: "Product successfully picked up and replaced.", Icon: ShieldCheck },
                          ];

                          return REP_STEPS.map((st, idx) => {
                            const isDone = repStep > idx;
                            const isCurrent = repStep === idx;
                            const isPending = repStep < idx || repStep === -1;
                            const { Icon } = st;
                            const isLast = idx === REP_STEPS.length - 1;

                            return (
                              <div key={st.key} className="flex gap-4">
                                {/* ─ left column: dot + line ─ */}
                                <div className="flex flex-col items-center w-10 shrink-0">
                                  <motion.div
                                    initial={false}
                                    animate={isCurrent ? { scale: [1, 1.12, 1] } : {}}
                                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                                    className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 shrink-0",
                                      isDone && "bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-100",
                                      isCurrent && "text-white shadow-lg ring-4 bg-indigo-500 border-indigo-500 ring-indigo-500/10",
                                      isPending && "bg-white border-zinc-200 text-zinc-300"
                                    )}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                      <Icon className="w-4.5 h-4.5" />
                                    )}
                                  </motion.div>
                                  {!isLast && (
                                    <div className="relative w-0.5 flex-1 my-1 overflow-hidden rounded-full bg-zinc-100" style={{ minHeight: "2.5rem" }}>
                                      <motion.div
                                        className="absolute inset-x-0 top-0 bg-indigo-400 rounded-full"
                                        initial={{ height: "0%" }}
                                        animate={{ height: isDone ? "100%" : "0%" }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* ─ right column: content ─ */}
                                <div className={cn("pb-7 pt-1.5 flex-1 min-w-0", isLast && "pb-0")}>
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={cn(
                                      "text-sm font-bold",
                                      isDone && "text-indigo-700",
                                      isCurrent && "text-zinc-950",
                                      isPending && "text-zinc-300"
                                    )}>
                                      {st.label}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-950 text-white px-2 py-0.5 rounded-full animate-pulse">
                                        Current
                                      </span>
                                    )}
                                    {isDone && (
                                      <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                        ✓ Done
                                      </span>
                                    )}
                                  </div>

                                  <p className={cn("text-xs leading-relaxed", isPending ? "text-zinc-300" : "text-zinc-500")}>
                                    {st.desc}
                                  </p>

                                  {(isDone || isCurrent) && (
                                    <p className="text-[10px] font-mono text-zinc-400 mt-1.5">
                                      {fmtDate(order.updated_at || order.created_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* ── Return Progress Timeline card ── */}
                  {order.return_tracking_id && ["return_requested", "return_approved", "returned", "refund_pending", "refunded"].includes(sl) && (
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mt-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-rose-500" />
                          <h3 className="text-sm font-bold text-zinc-900">Return Progress</h3>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-100 px-2.5 py-1 rounded-full animate-pulse">
                          Reverse Logistics
                        </span>
                      </div>

                      {/* Return Logistics Carrier and Tracking ID */}
                      {(() => {
                        const carrier = order.return_carrier || "Reverse Logistics Partner";
                        const trackingId = order.return_tracking_id;
                        const trackingUrl = getTrackingUrl(carrier, trackingId);
                        const shipStatus = shipment?.status || "PICKUP_SCHEDULED";
                        const theme = getShipmentStatusTheme(shipStatus);

                        return (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "p-4 rounded-xl border flex flex-col sm:flex-row justify-between gap-4 mb-6 hover:bg-zinc-50/80 transition-colors group",
                              theme.bg
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-105", theme.iconBg)}>
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", theme.text)}>
                                  {carrier}
                                  <span className="text-[9px] font-normal lowercase text-zinc-400 group-hover:underline">(click to track)</span>
                                </p>
                                <p className="text-xs font-bold text-zinc-900 font-mono mt-0.5">
                                  {trackingId}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center sm:text-right">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Return Status</p>
                              <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border mt-0.5 inline-block text-center", theme.badge)}>
                                {shipStatus.replace(/_/g, " ")}
                              </span>
                            </div>
                          </a>
                        );
                      })()}

                      {/* Visual Timeline of Return Stages */}
                      <div className="relative">
                        {(() => {
                          const returnStep = getReturnStatusStep(sl);
                          const RETURN_STEPS = [
                            { key: "return_requested", label: "Return Requested", desc: "Return request received. We'll review it shortly.", Icon: RotateCcw },
                            { key: "return_approved", label: "Return Approved", desc: "Return approved. Please ship the item back.", Icon: BadgeCheck },
                            { key: "returned", label: "Returned", desc: "Items returned to our warehouse.", Icon: Package },
                            { key: "refund_pending", label: "Refund Pending", desc: "Refund is being processed.", Icon: RefreshCcw },
                            { key: "refunded", label: "Refunded", desc: "Refund has been completed.", Icon: ShieldCheck },
                          ];

                          return RETURN_STEPS.map((st, idx) => {
                            const isDone = returnStep > idx;
                            const isCurrent = returnStep === idx;
                            const isPending = returnStep < idx || returnStep === -1;
                            const { Icon } = st;
                            const isLast = idx === RETURN_STEPS.length - 1;

                            return (
                              <div key={st.key} className="flex gap-4">
                                {/* ─ left column: dot + line ─ */}
                                <div className="flex flex-col items-center w-10 shrink-0">
                                  <motion.div
                                    initial={false}
                                    animate={isCurrent ? { scale: [1, 1.12, 1] } : {}}
                                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                                    className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 shrink-0",
                                      isDone && "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-100",
                                      isCurrent && "text-white shadow-lg ring-4 bg-rose-500 border-rose-500 ring-rose-500/10",
                                      isPending && "bg-white border-zinc-200 text-zinc-300"
                                    )}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                      <Icon className="w-4.5 h-4.5" />
                                    )}
                                  </motion.div>
                                  {!isLast && (
                                    <div className="relative w-0.5 flex-1 my-1 overflow-hidden rounded-full bg-zinc-100" style={{ minHeight: "2.5rem" }}>
                                      <motion.div
                                        className="absolute inset-x-0 top-0 bg-rose-400 rounded-full"
                                        initial={{ height: "0%" }}
                                        animate={{ height: isDone ? "100%" : "0%" }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* ─ right column: content ─ */}
                                <div className={cn("pb-7 pt-1.5 flex-1 min-w-0", isLast && "pb-0")}>
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={cn(
                                      "text-sm font-bold",
                                      isDone && "text-rose-700",
                                      isCurrent && "text-zinc-950",
                                      isPending && "text-zinc-300"
                                    )}>
                                      {st.label}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-950 text-white px-2 py-0.5 rounded-full animate-pulse">
                                        Current
                                      </span>
                                    )}
                                    {isDone && (
                                      <span className="text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                                        ✓ Done
                                      </span>
                                    )}
                                  </div>

                                  <p className={cn("text-xs leading-relaxed", isPending ? "text-zinc-300" : "text-zinc-500")}>
                                    {st.desc}
                                  </p>

                                  {(isDone || isCurrent) && (
                                    <p className="text-[10px] font-mono text-zinc-400 mt-1.5">
                                      {fmtDate(order.updated_at || order.created_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  className="min-h-[420px] bg-white border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-center p-10">
                  <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center mb-4 text-zinc-400">
                    <PackageSearch className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900">Enter your Order ID</h3>
                  <p className="text-sm text-zinc-400 max-w-xs mt-2 leading-relaxed">
                    Use the search box to track your shipment in real-time.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Review Dialog ── */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-900">Write a Review</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">Share your feedback for {reviewProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {reviewProduct?.image_url && (
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden relative">
                  <Image src={reviewProduct.image_url} alt={reviewProduct.name} fill sizes="64px" className="object-contain p-2" />
                </div>
              </div>
            )}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setReviewRating(i + 1)} className="text-amber-400 transition-transform hover:scale-110 active:scale-95">
                  <Star className={`h-8 w-8 ${i < reviewRating ? "fill-current" : "text-zinc-200"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)} disabled={reviewSubmitting} className="rounded-xl border-zinc-200">Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={reviewSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold">
              {reviewSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting</> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
