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
  Download,
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

  useEffect(() => {
    if (!orderId) return;

    async function fetchOrderDetails() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please log in to view order details.");
          router.push("/auth/login");
          return;
        }

        // Fetch Order details
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            *,
            order_items (
              *,
              products (*)
            ),
            order_status_history (
              *
            )
          `)
          .eq("id", orderId)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData);

        // Fetch User's reviewed products
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("product_reviews")
          .select("product_id")
          .eq("user_id", user.id);

        if (!reviewsError && reviewsData) {
          setReviewedProductIds(new Set(reviewsData.map(r => r.product_id)));
        }
      } catch (err: any) {
        console.error("Error loading order:", err);
        toast.error(err.message || "Failed to load order details");
      } finally {
        setLoading(false);
      }
    }

    fetchOrderDetails();
  }, [orderId, supabase, router]);

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

  const handleDownloadInvoice = async () => {
    if (!order) return;
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-indigo-600 transition-colors">
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
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-6 text-sm">
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
        <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-indigo-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>
        
        <div className="flex items-center gap-2">
          {!["delivered", "cancelled", "returned", "refunded", "return_requested", "return_approved", "refund_pending"].includes(order.status?.toLowerCase()) && (
            <Link href={`/track-order?orderId=${getDisplayOrderId(order.id, order.created_at)}`}>
              <Button variant="outline" size="sm" className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs rounded-lg font-medium">
                Track Order
              </Button>
            </Link>
          )}
          {order.status?.toLowerCase() === "delivered" && (
            <Button
              onClick={handleDownloadInvoice}
              variant="outline"
              size="sm"
              className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs rounded-lg font-medium gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Invoice
            </Button>
          )}
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-lg shadow-sm font-semibold transition-colors"
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
                <p className="font-semibold text-zinc-800 text-sm">{order.customer_name}</p>
                <p className="text-zinc-500 text-xs leading-relaxed mt-1">{order.shipping_address}</p>
                {order.phone && <p className="text-zinc-500 text-xs mt-2">📞 {order.phone}</p>}
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
                    <p className="text-indigo-650 text-xs font-semibold flex items-center gap-1 mt-2">
                      <Clock className="w-3.5 h-3.5" /> Est. Delivery: {order.delivery_estimate}
                    </p>
                  )}
                </div>
                {order.tracking_id && !["delivered", "cancelled", "returned", "refunded", "return_requested", "return_approved", "refund_pending"].includes(order.status?.toLowerCase()) && (
                  <Link href={`/track-order?orderId=${getDisplayOrderId(order.id, order.created_at)}`} className="inline-block mt-3">
                    <Button variant="link" size="sm" className="text-indigo-600 hover:text-indigo-755 p-0 text-xs font-semibold h-auto">
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
            
            <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden bg-white">
              {order.order_items?.map((item: any) => {
                const isReviewed = reviewedProductIds.has(item.products?.id);
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-zinc-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-zinc-50 rounded-lg relative shrink-0 overflow-hidden border border-zinc-100">
                        <Image
                          src={item.products?.image_url || "/images/placeholder.png"}
                          alt={item.products?.name || "Product image"}
                          fill
                          sizes="64px"
                          className="object-contain p-1.5"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">{item.products?.name || "Deleted Product"}</h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          Qty: <span className="font-semibold text-zinc-800">{item.quantity}</span>
                          <span className="mx-2 text-zinc-200">|</span>
                          Price: <span className="font-semibold text-zinc-800">{formatCurrency(item.unit_price)}</span> each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-50">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block sm:hidden">Subtotal</span>
                        <span className="text-sm font-bold text-zinc-900">{formatCurrency(item.quantity * parseFloat(item.unit_price))}</span>
                      </div>

                      {order.status?.toLowerCase() === "delivered" && item.products && !isReviewed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReviewDialog(item.products)}
                          className="text-xs h-8 px-3 border-zinc-200 text-zinc-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/50 rounded-lg transition-all font-semibold gap-1 shrink-0"
                        >
                          <Star className="w-3.5 h-3.5 text-zinc-400 fill-zinc-200" /> Write Review
                        </Button>
                      )}
                      
                      {isReviewed && (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50/50 border-emerald-100 text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reviewed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-705 text-white font-bold rounded-xl"
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
