"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import {
  PackageSearch,
  Search,
  Loader2,
  Package,
  CheckCircle2,
  Truck,
  Clock,
  MapPin,
  ReceiptText,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  FileDown,
  Star
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { getDisplayOrderId } from "@/lib/order";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function TrackOrderContent() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  // Review Modal State
  const [reviewProduct, setReviewProduct] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const handleDownloadInvoice = async (order: any) => {
    try {
      const { generateInvoicePDF } = await import("@/lib/invoice");
      const invoiceData = {
        orderId: order.id,
        date: order.created_at,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.phone,
        address: order.shipping_address || "N/A",
        items: order.order_items || [],
        totalAmount: parseFloat(order.total_amount)
      };
      const doc = await generateInvoicePDF(invoiceData);
      doc.save(`Invoice_${getDisplayOrderId(order.id, order.created_at)}.pdf`);
      toast.success("Invoice downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate/download invoice.");
    }
  };

  const handleOpenReviewDialog = (product: any) => {
    setReviewProduct(product);
    setReviewRating(5);
    setReviewText("");
    setIsReviewOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      toast.error("Please enter your review comments.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to write a review.");
        setIsReviewOpen(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const reviewerName = profile?.full_name || user.user_metadata?.full_name || user.email || "Customer";

      const { error } = await supabase.from("product_reviews").insert([
        {
          product_id: reviewProduct.id,
          user_id: user.id,
          reviewer_name: reviewerName,
          rating: reviewRating,
          review: reviewText,
        },
      ]);

      if (error) throw error;

      toast.success("Thank you for your rating & review!");
      setIsReviewOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const performTracking = async (id: string) => {
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const trimmedId = id.trim();
      const isCustomId = trimmedId.startsWith("OD");

      if (!isCustomId) {
        setError("Please enter a valid Order ID starting with 'OD'.");
        return;
      }

      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            products (name, image_url)
          )
        `);

      const tsString = trimmedId.substring(2, 15);
      const ts = parseInt(tsString);

      if (!isNaN(ts)) {
        const start = new Date(ts - 5000).toISOString();
        const end = new Date(ts + 5000).toISOString();

        query = query
          .gte("created_at", start)
          .lte("created_at", end);
      } else {
        setError("Invalid Order ID format.");
        return;
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      if (!data || data.length === 0) {
        setError("We couldn't find an order with that ID. Please check the spelling.");
        return;
      }

      const foundOrder = data.find(
        (o: any) => getDisplayOrderId(o.id, o.created_at) === trimmedId
      );

      if (!foundOrder) {
        setError("We couldn't find an order with that ID. Please check the spelling.");
      } else {
        setOrder(foundOrder);
      }
    } catch (err: any) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlOrderId = searchParams.get("orderId");

    if (urlOrderId) {
      setOrderId(urlOrderId);
      performTracking(urlOrderId);
    }
  }, [searchParams]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    performTracking(orderId);
  };

  const getStatusStep = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending" || s === "placed" || s === "confirmed") return 0;
    if (s === "processing") return 1;
    if (s === "shipped") return 2;
    if (s === "delivered") return 3;
    return -1; // Terminal / Special status (Cancelled, Returned, Failed)
  };

  const formatMilestoneDate = (baseDateStr: string, hoursToAdd: number) => {
    const d = new Date(baseDateStr);
    d.setHours(d.getHours() + hoursToAdd);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const milestones = useMemo(() => {
    if (!order) return [];
    const baseDate = order.created_at;
    const statusStep = getStatusStep(order.status);
    const carrierName = order.carrier || "Delivery Partner";
    const statusLower = order.status.toLowerCase();

    const list = [];

    // Add Order Placed milestone for all orders
    list.push({
      title: "Order Placed",
      description: "Your order details have been successfully saved. Payment authorized.",
      time: formatMilestoneDate(baseDate, 0),
      status: "confirmed"
    });

    if (statusLower === "cancelled") {
      list.push({
        title: "Cancelled",
        description: "This order has been cancelled and will not be processed further.",
        time: order.updated_at ? formatMilestoneDate(order.updated_at, 0) : formatMilestoneDate(baseDate, 1),
        status: "cancelled"
      });
    } else if (statusLower === "returned") {
      list.push({
        title: "Returned",
        description: "This order has been returned to our hub.",
        time: order.updated_at ? formatMilestoneDate(order.updated_at, 0) : formatMilestoneDate(baseDate, 1),
        status: "returned"
      });
    } else if (statusLower === "failed") {
      list.push({
        title: "Failed",
        description: "The order transaction or processing has failed.",
        time: order.updated_at ? formatMilestoneDate(order.updated_at, 0) : formatMilestoneDate(baseDate, 1),
        status: "failed"
      });
    } else {
      if (statusStep >= 1) {
        list.push({
          title: "Under Processing",
          description: "Items picked and undergoing quality inspection at Zirakpur hub.",
          time: formatMilestoneDate(baseDate, 4),
          status: "processing"
        });
      }
      if (statusStep >= 2) {
        list.push({
          title: "Dispatched",
          description: `Handed over to ${carrierName}. Tracking details generated.`,
          time: formatMilestoneDate(baseDate, 12),
          status: "shipped"
        });
      }
      if (statusStep >= 3) {
        list.push({
          title: "Delivered",
          description: "Package received and signed. Transaction complete.",
          time: formatMilestoneDate(baseDate, 32),
          status: "delivered"
        });
      }
    }

    return list.reverse();
  }, [order]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50/20 to-white pb-24 font-sans relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-500/[0.012] rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/[0.012] rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Header System */}
      <section className="border-b border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Real-time Tracker
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950">
            Track your order
          </h1>
          <p className="text-zinc-500 text-sm md:text-base mt-2 max-w-xl leading-relaxed">
            Enter your secure Order ID (starting with OD) to retrieve your package's real-time shipment progress and digital invoices.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-12 items-start">

          {/* Form Box Column */}
          <div className="lg:col-span-4 sticky top-8">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-zinc-50 border border-zinc-200/60 rounded-xl flex items-center justify-center text-zinc-500 shadow-sm">
                  <Search className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 tracking-tight">Locate Shipment</h2>
                  <p className="text-[10px] font-semibold text-zinc-400">Search secure orders</p>
                </div>
              </div>

              <form onSubmit={handleTrack} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="track-order-id" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Secure Order ID
                  </label>
                  <Input
                    id="track-order-id"
                    placeholder="e.g. OD177840830..."
                    className="h-11 rounded-xl bg-zinc-50/50 border-zinc-200 text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-all placeholder:text-zinc-300 font-bold"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-zinc-950 hover:bg-zinc-800 active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Locating...
                    </>
                  ) : (
                    <>
                      <PackageSearch className="w-3.5 h-3.5" />
                      Track Shipment
                    </>
                  )}
                </button>
              </form>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-5 p-4 bg-rose-50/50 text-rose-700 rounded-xl text-xs flex items-start gap-3 border border-rose-100/60"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-semibold">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Help Box */}
            <div className="mt-4 p-5 bg-zinc-50 border border-zinc-200/50 rounded-2xl flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0" />
              <div className="text-[10px] text-zinc-500 font-medium leading-normal">
                Forgot your Order ID? Check the confirmation receipt sent to your registered email/phone number.
              </div>
            </div>
          </div>

          {/* Results Box Column */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {order ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Status Banner Card */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                          Secure Shipment Record
                        </span>
                        <h3 className="text-lg font-bold text-zinc-950 tracking-tight">
                          {getDisplayOrderId(order.id, order.created_at)}
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                          Placed: {new Date(order.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-black px-3 py-1.5 border uppercase tracking-wider rounded-lg flex items-center gap-1.5",
                          order.status.toLowerCase() === "delivered"
                            ? "bg-emerald-500/8 text-emerald-700 border-emerald-500/15"
                            : order.status.toLowerCase() === "shipped"
                              ? "bg-indigo-500/8 text-indigo-700 border-indigo-500/15"
                              : order.status.toLowerCase() === "processing"
                                ? "bg-blue-500/8 text-blue-700 border-blue-500/15"
                                : order.status.toLowerCase() === "cancelled" || order.status.toLowerCase() === "failed"
                                  ? "bg-rose-500/8 text-rose-700 border-rose-500/15"
                                  : order.status.toLowerCase() === "returned"
                                    ? "bg-amber-500/8 text-amber-700 border-amber-500/15"
                                    : "bg-zinc-500/8 text-zinc-700 border-zinc-500/15"
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          {order.status}
                        </span>

                        <button
                          onClick={() => {
                            setOrderId("");
                            setOrder(null);
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-zinc-50 border border-zinc-200/60 flex items-center justify-center text-zinc-400 hover:text-zinc-650 transition-colors"
                          title="Reset Tracker"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Terminal Status Alert Banner */}
                    {getStatusStep(order.status) === -1 && (
                      <div className={cn(
                        "p-4 mb-6 rounded-2xl border flex items-center gap-3",
                        order.status.toLowerCase() === "cancelled" && "bg-red-50 border-red-200 text-red-800",
                        order.status.toLowerCase() === "returned" && "bg-amber-50 border-amber-200 text-amber-800",
                        order.status.toLowerCase() === "failed" && "bg-rose-50 border-rose-200 text-rose-800"
                      )}>
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">Order {order.status}</p>
                          <p className="text-[11px] font-medium opacity-90 mt-0.5">
                            {order.status.toLowerCase() === "cancelled" && "This order has been cancelled and cannot be tracked further."}
                            {order.status.toLowerCase() === "returned" && "This order has been returned to our warehouse."}
                            {order.status.toLowerCase() === "failed" && "This order payment or transaction has failed."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Timeline Progress */}
                    {getStatusStep(order.status) !== -1 && (
                      <div className="relative py-4 mb-6">
                        {/* Background track line */}
                        <div className="absolute top-[28px] left-[12.5%] right-[12.5%] h-0.5 bg-zinc-100 z-0" />

                        {/* Active progress line */}
                        <div
                          className="absolute top-[28px] left-[12.5%] h-0.5 bg-zinc-900 z-0 transition-all duration-700 ease-out"
                          style={{
                            width: `${(getStatusStep(order.status) / 3) * 75}%`,
                          }}
                        />

                        <div className="relative z-10 flex justify-between">
                          {[
                            { icon: Clock, label: "Confirmed" },
                            { icon: Package, label: "Processing" },
                            { icon: Truck, label: "Shipped" },
                            { icon: CheckCircle2, label: "Delivered" },
                          ].map((step, idx) => {
                            const isCompleted = getStatusStep(order.status) >= idx;
                            const isCurrent = getStatusStep(order.status) === idx;
                            const Icon = step.icon;

                            return (
                              <div key={step.label} className="flex flex-col items-center gap-2.5 w-1/4">
                                <div
                                  className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border bg-white",
                                    isCompleted
                                      ? "border-zinc-950 text-zinc-950 shadow-sm"
                                      : "border-zinc-200 text-zinc-300",
                                    isCurrent && "ring-4 ring-zinc-900/5 bg-zinc-950 border-zinc-950 text-white"
                                  )}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span
                                  className={cn(
                                    "text-[10px] font-black uppercase tracking-wider text-center select-none",
                                    isCompleted ? "text-zinc-800" : "text-zinc-400"
                                  )}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Carrier Info */}
                    {order.tracking_id && (
                      <div className="mt-8 p-5 bg-zinc-50/50 border border-zinc-200/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-250 shadow-sm text-zinc-400">
                            <MapPin className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              Carrier Handle: {order.carrier || "Partner Logistics"}
                            </p>
                            <p className="text-xs font-bold text-zinc-850 mt-0.5">
                              Waybill ID: <span className="font-mono text-zinc-950 text-sm">{order.tracking_id}</span>
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all w-full sm:w-auto shadow-sm">
                          Track Carrier Direct
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Visual Transit Logs & Item list Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

                    {/* Visual Transit Log Updates */}
                    <div className="md:col-span-3 bg-white p-6 md:p-8 rounded-3xl border border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
                      <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-4">
                        <MapPin className="w-4.5 h-4.5 text-zinc-400" />
                        <h4 className="text-sm font-bold text-zinc-900 tracking-tight">Transit Logs</h4>
                      </div>

                      <div className="relative pl-4 border-l border-zinc-150 space-y-6 ml-2 py-1">
                        {milestones.map((milestone, idx) => (
                          <div key={idx} className="relative group">
                            {/* Point Indicator */}
                            <span className={cn(
                              "absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border border-white transition-all duration-300",
                              idx === 0
                                ? "bg-emerald-500 ring-4 ring-emerald-500/10"
                                : "bg-zinc-350"
                            )} />

                            <div>
                              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                                <h5 className={cn(
                                  "text-xs font-bold",
                                  idx === 0 ? "text-zinc-950" : "text-zinc-650"
                                )}>
                                  {milestone.title}
                                </h5>
                                <span className="text-[9px] font-semibold text-zinc-450 uppercase">{milestone.time}</span>
                              </div>
                              <p className="text-[11px] text-zinc-450 font-medium leading-relaxed mt-1">
                                {milestone.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Value & Invoice Card */}
                    <div className="md:col-span-2 space-y-6">
                      {/* Total Card */}
                      <div className="bg-zinc-950 p-6 md:p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden min-h-[180px]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                        <div className="relative z-10">
                          <span className="text-[9px] font-black text-zinc-450 uppercase tracking-widest">
                            Total Order Value
                          </span>
                          <h4 className="text-3xl font-black tracking-tight mt-2 text-white">
                            ₹{order.total_amount.toLocaleString("en-IN")}
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-bold mt-1.5 block uppercase tracking-wider">
                            Paid via Credit / Netbanking
                          </span>
                        </div>

                        {order.status?.toLowerCase() === "delivered" ? (
                          <button
                            onClick={() => handleDownloadInvoice(order)}
                            className="relative z-10 mt-6 flex items-center justify-between w-full p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider group cursor-pointer"
                          >
                            Download Invoice
                            <FileDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                          </button>
                        ) : (
                          <div
                            title="Invoice will generate after delivery"
                            className="relative z-10 mt-6 p-4 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider"
                          >
                            Invoice generated after delivery
                          </div>
                        )}
                      </div>

                      {/* Return CTA */}
                      <div className="p-5 border border-zinc-200/80 rounded-2xl bg-white flex items-center justify-between gap-4">
                        <div>
                          <h5 className="text-xs font-bold text-zinc-900">Need to cancel or return?</h5>
                          <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Sensitive items return rule apply</p>
                        </div>
                        <Link
                          href="/contact"
                          className="w-8 h-8 rounded-lg bg-zinc-50 hover:bg-zinc-950 hover:text-white flex items-center justify-center text-zinc-400 transition-all border border-zinc-200/50"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                  </div>

                  {/* Items Summary Card */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
                    <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-4">
                      <ReceiptText className="w-4.5 h-4.5 text-zinc-400" />
                      <h4 className="text-sm font-bold text-zinc-900 tracking-tight">Consolidated Items</h4>
                    </div>                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {order.order_items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-zinc-150/70 hover:bg-zinc-50 hover:border-zinc-250 transition-all duration-300 w-full"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-14 h-14 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden flex-shrink-0 relative">
                              {item.products?.image_url ? (
                                <Image
                                  src={item.products.image_url}
                                  alt={item.products.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <Package className="w-5 h-5 text-zinc-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center">
                              <p className="text-xs font-bold text-zinc-850 truncate leading-snug">
                                {item.products?.name}
                              </p>
                              <p className="text-[10px] text-zinc-450 font-bold uppercase mt-1">
                                Quantity: <span className="text-zinc-650">{item.quantity}</span>
                              </p>
                            </div>
                          </div>

                          {order.status?.toLowerCase() === "delivered" && item.products && (
                            <button
                              onClick={() => handleOpenReviewDialog(item.products)}
                              className="shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
                            >
                              Give Review
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Empty Awaiting Details State */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="h-full min-h-[460px] bg-white border-2 border-dashed border-zinc-200/80 rounded-3xl flex flex-col items-center justify-center text-center p-8 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.005)]"
                >
                  <div className="w-16 h-16 bg-zinc-50 border border-zinc-200/60 rounded-2xl flex items-center justify-center mb-5 shadow-sm text-zinc-450">
                    <PackageSearch className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                    Awaiting tracking inputs
                  </h3>
                  <p className="text-xs font-medium text-zinc-450 max-w-xs mt-2 leading-relaxed">
                    Input your secure shipment reference or Order ID in the locator sidebar to inspect transit histories and log files.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-150 p-6 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-900">Write a Review</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Share your feedback for {reviewProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewProduct?.image_url && (
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 bg-gray-50 border border-zinc-100 rounded-xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                  <Image
                    src={reviewProduct.image_url}
                    alt={reviewProduct.name}
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                </div>
              </div>
            )}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setReviewRating(index + 1)}
                  className="text-amber-500 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star className={`h-8 w-8 ${index < reviewRating ? "fill-current" : "text-zinc-200"}`} />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Your Review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience using this product..."
                rows={4}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsReviewOpen(false)}
              className="w-full sm:w-auto rounded-xl border-zinc-200"
              disabled={reviewSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl"
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-zinc-50">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}