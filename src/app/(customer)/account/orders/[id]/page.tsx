"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Truck,
  ChevronLeft,
  ChevronRight,
  Box,
  Clock,
  CheckCircle2,
  Loader2,
  Star,
  MapPin,
  CreditCard,
  FileText,
  AlertCircle
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/format";
import { getDisplayOrderId, getReturnWindowInfo } from "@/lib/order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loadRazorpayScript } from "@/lib/razorpay";
import { cancelOrder, returnOrder } from "@/app/actions/orders";
import { useOrderDetails } from "@/hooks/api/useOrders";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());

  // Interactive Action States
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Review Modal State
  const [reviewProduct, setReviewProduct] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Return Modal State
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: ""
  });

  const supabase = createClient();
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  const { data: fetchedOrder, isLoading, error } = useOrderDetails(orderId);

  useEffect(() => {
    if (isAuthInitialized && !user) {
      toast.error("Please log in to view order details.");
      router.push("/auth/login");
    }
  }, [user, isAuthInitialized, router]);

  useEffect(() => {
    if (fetchedOrder) {
      setOrder(fetchedOrder);
    }
  }, [fetchedOrder]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (!user) return;
    async function fetchUserReviews() {
      try {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("product_reviews")
          .select("product_id")
          .eq("user_id", user!.id);

        if (!reviewsError && reviewsData) {
          setReviewedProductIds(new Set(reviewsData.map(r => r.product_id)));
        }
      } catch (err) {
        // ignore
      }
    }
    if (isAuthInitialized) {
      fetchUserReviews();
    }
  }, [user, supabase, isAuthInitialized]);

  const handlePayOnline = async () => {
    if (typeof window === "undefined" || !order) return;
    setPaying(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Failed to load Razorpay SDK. Please check your connection.");
      }

      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(order.total_amount),
          idempotencyKey: order.id
        })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to initialize payment.");
      }

      const razorpayOrder = await orderRes.json();

      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ razorpay_order_id: razorpayOrder.id })
        .eq("id", order.id);

      if (updateOrderError) {
        console.error("Failed to associate Razorpay Order ID:", updateOrderError);
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "UC Enterprises",
        description: `Payment for Order #${getDisplayOrderId(order.id, order.created_at)}`,
        image: "/logo.png",
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          try {
            const res = await fetch("/api/orders/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                paymentStatus: "Paid",
                paymentMethod: "ONLINE",
                razorpayOrderId: response.razorpay_order_id || razorpayOrder.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });

            if (res.ok) {
              toast.success("Payment successful!");
              setOrder((prev: any) => ({
                ...prev,
                payment_status: "Paid",
                payment_method: "ONLINE"
              }));
            } else {
              toast.error("Failed to verify payment. Please contact support.");
            }
          } catch (err) {
            toast.error("Error processing payment verification.");
          }
        },
        prefill: {
          name: order.customer_name || "",
          email: order.customer_email || "",
          contact: order.phone || "",
        },
        notes: {
          orderId: order.id
        },
        theme: {
          color: "#f97316",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Error initiating payment.");
    } finally {
      setPaying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);

    try {
      const res = await cancelOrder(order.id);
      if (res.success) {
        toast.success("Order cancelled successfully!");
        setOrder((prev: any) => ({
          ...prev,
          status: "Cancelled",
          payment_status: "Cancelled"
        }));
      } else {
        toast.error(res.error || "Failed to cancel order");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenReturnDialog = () => {
    setReturnReason("");
    setBankDetails({ bankName: "", accountName: "", accountNumber: "", ifscCode: "" });
    setIsReturnOpen(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      toast.error("Please enter a reason for your return.");
      return;
    }
    if (!order) return;

    if (order.payment_method === "COD") {
      if (!bankDetails.bankName || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
        toast.error("Please fill all bank details for the refund.");
        return;
      }
    }

    setReturnSubmitting(true);
    try {
      const res = await returnOrder(order.id, returnReason, order.payment_method === "COD" ? bankDetails : undefined);
      if (res.success) {
        toast.success("Return requested successfully!");
        setOrder((prev: any) => ({
          ...prev,
          status: "RETURN_REQUESTED",
          payment_status: "Refund Pending"
        }));
        setIsReturnOpen(false);
      } else {
        toast.error(res.error || "Failed to process return.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setReturnSubmitting(false);
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
      setReviewedProductIds(prev => {
        const next = new Set(prev);
        next.add(reviewProduct.id);
        return next;
      });
      setIsReviewOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    return_requested: "Return Requested",
    return_approved: "Return Approved",
    returned: "Returned",
    refund_pending: "Refund Pending",
    refunded: "Refunded",
    failed: "Failed",
    placed: "Placed",
  };

  const getStatusLabel = (status: string): string => {
    return STATUS_LABEL[status?.toLowerCase()] ?? status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "default";
      case "shipped":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-red-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <Card className="border-dashed py-16 text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Order not found</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-1">We couldn't retrieve the details for this order. It may not exist or you may not have permission to view it.</p>
          </div>
          <Link href="/account/orders">
            <Button className="bg-red-600 hover:bg-red-700 text-white h-9 px-6 text-sm">
              View Order History
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { isReturnable: isWithinReturnWindow, daysRemaining } = getReturnWindowInfo(order);
  const isCancellable = ["pending", "placed", "confirmed", "processing"].includes(order.status?.toLowerCase());
  const isReturnable = order.status?.toLowerCase() === "delivered" && isWithinReturnWindow;
  const isUnpaid = order.payment_status?.toLowerCase() !== "paid" && ["pending", "placed", "confirmed"].includes(order.status?.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-red-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>

        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Main Order Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Order Details</span>
                <Badge variant={getStatusVariant(order.status)} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize border-0 shadow-none">
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 mt-1">
                {getDisplayOrderId(order.id, order.created_at)}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Placed on: {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Total Amount</span>
                <span className="text-xl font-bold text-zinc-900">{formatCurrency(order.total_amount)}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-bold capitalize ml-2 inline-block",
                  order.payment_status?.toLowerCase() === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                )}>
                  {order.payment_status || "Unpaid"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                {isUnpaid && (
                  <Button
                    onClick={handlePayOnline}
                    disabled={paying}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4 rounded-lg shadow-sm font-semibold transition-colors"
                  >
                    {paying ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Processing</>
                    ) : "Pay Online"}
                  </Button>
                )}

                {isCancellable && (
                  <Button
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    variant="outline"
                    className="border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-655 hover:border-red-100 text-xs h-9 px-4 rounded-lg font-semibold transition-colors"
                  >
                    {cancelling ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Cancelling</>
                    ) : "Cancel Order"}
                  </Button>
                )}

                {order.status?.toLowerCase() === "delivered" && (
                  isWithinReturnWindow ? (
                    <Button
                      onClick={handleOpenReturnDialog}
                      variant="outline"
                      className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs h-9 px-4 rounded-lg font-semibold transition-colors"
                    >
                      Return Order ({daysRemaining}d left)
                    </Button>
                  ) : (
                    <span className="text-xs text-zinc-400 font-medium px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg">
                      Return window expired
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 divide-y divide-zinc-100">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Shipping Address
              </h4>
              <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100/80 min-h-[120px]">
                {order.shipping_address?.includes("\n") ? (
                  <p className="text-zinc-850 text-xs leading-relaxed whitespace-pre-wrap">{order.shipping_address}</p>
                ) : (
                  <>
                    <p className="font-semibold text-zinc-800 text-sm">{order.customer_name}</p>
                    <p className="text-zinc-500 text-xs leading-relaxed mt-1 whitespace-pre-wrap">{order.shipping_address}</p>
                    {order.phone && <p className="text-zinc-500 text-xs mt-2">📞 {order.phone}</p>}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-zinc-400" /> Payment Information
              </h4>
              <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100/80 min-h-[120px]">
                <p className="font-semibold text-zinc-700 text-sm">
                  {order.is_emi ? "EMI / Buy Now Pay Later" : (order.payment_method || "—")}
                </p>
                <p className="text-zinc-500 text-xs mt-1">Status: <span className="font-semibold text-zinc-750">{order.payment_status || "Unpaid"}</span></p>
                {order.is_emi && (
                  <div className="mt-3 p-3 bg-white border border-zinc-200/60 rounded-xl space-y-2 text-xs font-semibold text-zinc-650">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">EMI Summary</p>
                    <div className="flex justify-between items-center">
                      <span>Provider:</span>
                      <span className="text-zinc-950 font-bold">{order.emi_details?.provider_name || "Lender"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tenure:</span>
                      <span className="text-zinc-950 font-bold">{order.emi_tenure} Months</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Installment:</span>
                      <span className="text-zinc-950 font-bold">₹{(Number(order.emi_monthly_installment) || 0).toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Interest Rate:</span>
                      <span className="text-zinc-950 font-bold">{order.emi_interest_rate}% p.a.</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-zinc-150 pt-2 text-zinc-800">
                      <span>Total Payable:</span>
                      <span className="text-zinc-950 font-black">₹{(Number(order.emi_total_payable) || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
                {order.transaction_id && (
                  <p className="text-zinc-400 text-[10px] font-mono mt-2 break-all">
                    Txn ID: {order.transaction_id}
                  </p>
                )}
                {order.razorpay_order_id && (
                  <p className="text-zinc-400 text-[10px] font-mono mt-1 break-all">
                    Razorpay Order ID: {order.razorpay_order_id}
                  </p>
                )}
                {order.razorpay_payment_id && (
                  <p className="text-zinc-400 text-[10px] font-mono mt-1 break-all">
                    Razorpay Payment ID: {order.razorpay_payment_id}
                  </p>
                )}
                {order.payment_method === "COD" && (order.payment_status === "Refund Pending" || order.status?.toUpperCase() === "REFUND_PENDING") && (
                  <div className="mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-800 leading-normal">
                    ℹ️ Cash refunds take 2-3 business days to be processed and credited to your bank account.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-zinc-400" /> Logistics & Tracking
              </h4>
              <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100/80 min-h-[120px] flex flex-col justify-between">
                <div>
                  {order.tracking_id ? (
                    <>
                      <p className="text-xs font-semibold text-zinc-800">{order.carrier || "Standard Delivery"}</p>
                      <p className="font-mono text-zinc-500 text-xs mt-1">Tracking ID: {order.tracking_id}</p>
                    </>
                  ) : (
                    <p className="text-zinc-400 italic text-xs">Not yet dispatched</p>
                  )}
                  {order.delivery_estimate && order.status?.toLowerCase() !== "delivered" && (
                    <p className="text-red-600 text-xs font-semibold flex items-center gap-1 mt-2">
                      <Clock className="w-3.5 h-3.5" /> Est. Delivery: {order.delivery_estimate}
                    </p>
                  )}
                </div>
                {order.tracking_id && !["delivered", "cancelled", "returned", "refunded", "return_requested", "return_approved", "refund_pending"].includes(order.status?.toLowerCase()) && (
                  <Link href={`/track-order?orderId=${getDisplayOrderId(order.id, order.created_at)}`} className="inline-block mt-3">
                    <Button variant="link" size="sm" className="text-red-600 hover:text-red-700 p-0 text-xs font-semibold h-auto">
                      Live tracking view <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="pt-6">
            <h3 className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider mb-4">
              Items Ordered ({order.order_items?.length || 0})
            </h3>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden border border-zinc-100 rounded-xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-505 font-bold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Product details</th>
                    <th className="px-4 py-3 text-center">HSN Code</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Price (Excl. GST)</th>
                    <th className="px-4 py-3 text-right">GST</th>
                    <th className="px-4 py-3 text-right">Total (Incl. GST)</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {order.order_items?.map((item: any) => {
                    const isReviewed = reviewedProductIds.has(item.products?.id);
                    const quantity = item.quantity;
                    const unitPrice = parseFloat(item.unit_price);
                    const itemTotal = quantity * unitPrice;
                    const rate = (item.products?.igst_rate || 0) + (item.products?.cgst_rate || 0) + (item.products?.sgst_rate || 0);
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

                    const baseUnitPrice = baseTotal / quantity;

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-4 py-3 flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-50 rounded-lg relative shrink-0 overflow-hidden border border-zinc-100">
                            <Image
                              src={item.products?.image_url || "/images/placeholder.png"}
                              alt={item.products?.name || "Product image"}
                              fill
                              sizes="40px"
                              className="object-contain p-1"
                            />
                          </div>
                          <span className="font-semibold text-zinc-900 line-clamp-2 pr-2">
                            {item.products?.name || "Deleted Product"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-zinc-505">
                          {item.products?.hsn_code || "-"}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-zinc-800">
                          {quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-750">
                          {formatCurrency(baseUnitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-650">
                          {rate > 0 ? `${rate}% (${formatCurrency(taxAmount)})` : "0%"}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-zinc-900">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.status?.toLowerCase() === "delivered" && item.products && !isReviewed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReviewDialog(item.products)}
                              className="text-[10px] h-7 px-2 border-zinc-200 text-zinc-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/50 rounded-lg transition-all font-semibold gap-1 inline-flex items-center shrink-0"
                            >
                              <Star className="w-3 h-3 text-zinc-400 fill-zinc-200" /> Review
                            </Button>
                          )}
                          {isReviewed && (
                            <Badge variant="outline" className="text-emerald-700 bg-emerald-50/50 border-emerald-100 text-[10px] px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Reviewed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stack View */}
            <div className="block md:hidden divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden bg-white shadow-sm">
              {order.order_items?.map((item: any) => {
                const isReviewed = reviewedProductIds.has(item.products?.id);
                const quantity = item.quantity;
                const unitPrice = parseFloat(item.unit_price);
                const itemTotal = quantity * unitPrice;
                const rate = (item.products?.igst_rate || 0) + (item.products?.cgst_rate || 0) + (item.products?.sgst_rate || 0);
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

                const baseUnitPrice = baseTotal / quantity;

                return (
                  <div key={item.id} className="p-4 space-y-3 hover:bg-zinc-50/50 transition-colors">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-zinc-50 rounded-lg relative shrink-0 overflow-hidden border border-zinc-100">
                        <Image
                          src={item.products?.image_url || "/images/placeholder.png"}
                          alt={item.products?.name || "Product image"}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-zinc-900 leading-snug">
                          {item.products?.name || "Deleted Product"}
                        </h4>
                        {item.products?.hsn_code && (
                          <p className="text-[10px] text-zinc-400 font-medium font-mono">
                            HSN: {item.products.hsn_code}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-[11px] pt-1.5 border-t border-zinc-50">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Quantity</span>
                        <span className="text-zinc-800 font-bold">{quantity}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Price (Excl. GST)</span>
                        <span className="text-zinc-800">{formatCurrency(baseUnitPrice)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">GST</span>
                        <span className="text-zinc-700">{rate > 0 ? `${rate}% (${formatCurrency(taxAmount)})` : "0%"}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Total (Incl. GST)</span>
                        <span className="text-zinc-950 font-extrabold">{formatCurrency(lineTotal)}</span>
                      </div>
                    </div>

                    {(order.status?.toLowerCase() === "delivered" && item.products && !isReviewed) || isReviewed ? (
                      <div className="pt-2 flex justify-end">
                        {order.status?.toLowerCase() === "delivered" && item.products && !isReviewed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReviewDialog(item.products)}
                            className="text-[10px] h-7 px-3 border-zinc-200 text-zinc-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/50 rounded-lg transition-all font-semibold gap-1 inline-flex items-center"
                          >
                            <Star className="w-3.5 h-3.5 text-zinc-400 fill-zinc-200" /> Write Review
                          </Button>
                        )}
                        {isReviewed && (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50/50 border-emerald-100 text-[10px] px-2.5 py-0.5 rounded-lg font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reviewed
                          </Badge>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Detailed Price Breakdown */}
            {(() => {
              // Calculate tax breakdown and base subtotal
              const taxBreakdown: Record<string, number> = {};
              let baseSubtotal = 0;

              order.order_items?.forEach((item: any) => {
                const itemTotal = item.quantity * parseFloat(item.unit_price);
                const rate = (item.products?.igst_rate || 0) + (item.products?.cgst_rate || 0) + (item.products?.sgst_rate || 0);

                if (rate > 0) {
                  let taxAmount = 0;
                  let basePrice = itemTotal;

                  if (item.products?.is_tax_inclusive) {
                    basePrice = itemTotal / (1 + rate / 100);
                    taxAmount = itemTotal - basePrice;
                  } else {
                    taxAmount = itemTotal * (rate / 100);
                  }

                  baseSubtotal += basePrice;

                  if (!taxBreakdown[rate]) taxBreakdown[rate] = 0;
                  taxBreakdown[rate] += taxAmount;
                } else {
                  baseSubtotal += itemTotal;
                }
              });

              const hasBreakdown = Object.keys(taxBreakdown).length > 0;

              // Fallback if there are no itemized taxes but an aggregate tax amount exists
              const aggregateTax = parseFloat(order.tax_amount || 0);
              if (!hasBreakdown && aggregateTax > 0) {
                const grossSubtotal = order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity * parseFloat(item.unit_price)), 0) || 0;
                // We don't know if grossSubtotal includes tax, but if we don't have breakdown, we assume it does based on the requirement
                baseSubtotal = grossSubtotal - aggregateTax;
              } else if (!hasBreakdown && aggregateTax === 0) {
                baseSubtotal = order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity * parseFloat(item.unit_price)), 0) || 0;
              }

              return (
                <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2.5 max-w-sm ml-auto mt-6">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>SUBTOTAL (EXCL. GST)</span>
                    <span>₹{baseSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {parseFloat(order.shipping_amount || 0) > 0 && (
                    <div className="flex justify-between text-xs font-bold text-zinc-500">
                      <span>DELIVERY CHARGE</span>
                      <span>₹{parseFloat(order.shipping_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {parseFloat(order.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-xs font-bold text-rose-600">
                      <span>COUPON DISCOUNT</span>
                      <span>-₹{parseFloat(order.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-zinc-900 border-t border-zinc-200 pt-2.5">
                    <span>TOTAL AMOUNT</span>
                    <span>₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
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
                <div className="w-16 h-16 bg-gray-50 border border-zinc-100 rounded-xl overflow-hidden relative">
                  <Image
                    src={reviewProduct.image_url}
                    alt={reviewProduct.name}
                    fill
                    sizes="64px"
                    className="object-contain p-2"
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

      {/* Return Dialog */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-150 p-6 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-900">Return Order</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Please let us know why you are returning this order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Reason for Return</label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="E.g., Defective product, not as described, etc."
                rows={4}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              />
            </div>
            {order.payment_method === "COD" && (
              <div className="space-y-4 pt-4 border-t border-zinc-100 mt-4">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Refund Bank Details</h4>
                  <p className="text-xs text-zinc-500 mb-4">Since this is a COD order, please provide your bank details for the refund. Cash refunds take 2-3 business days to be processed and credited to your bank account.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider">Bank Name</label>
                    <Input value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} placeholder="e.g. State Bank of India" className="rounded-xl border-zinc-200" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider">Account Holder Name</label>
                    <Input value={bankDetails.accountName} onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })} placeholder="Name as per bank account" className="rounded-xl border-zinc-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider">Account Number</label>
                      <Input type="password" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} placeholder="Account Number" className="rounded-xl border-zinc-200" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider">IFSC Code</label>
                      <Input value={bankDetails.ifscCode} onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })} placeholder="IFSC Code" className="rounded-xl border-zinc-200 uppercase" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsReturnOpen(false)}
              className="w-full sm:w-auto rounded-xl border-zinc-200"
              disabled={returnSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReturn}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              disabled={returnSubmitting}
            >
              {returnSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting
                </>
              ) : (
                "Request Return"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
