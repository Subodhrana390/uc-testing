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
  AlertCircle,
  Camera,
  Upload,
  X,
  FileDown
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
import { cancelOrder, returnOrder, requestOrderReplacement } from "@/app/actions/orders";
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

const RETURN_SUB_REASONS: Record<string, string[]> = {
  "Product is damaged / broken": [
    "Product was broken/shattered",
    "Scratches or physical dents on product",
    "Outer packaging was damaged, causing product damage"
  ],
  "Product is defective / doesn't function": [
    "Product doesn't turn on/work at all",
    "Product functions poorly",
    "Software/firmware issues"
  ],
  "Item or accessories missing from the package": [
    "Key accessories are missing",
    "User manual or cables missing",
    "Product box is completely empty"
  ],
  "Received wrong product / incorrect specifications": [
    "Incorrect model/size",
    "Different color received",
    "Received a completely different product"
  ],
  "Product quality is not up to expectations": [
    "Performance not up to mark",
    "Materials feel cheap",
    "Product differs from website images"
  ]
};

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
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: ""
  });

  // Return Wizard States
  const [returnStep, setReturnStep] = useState(1);
  const [returnType, setReturnType] = useState<"REFUND" | "REPLACEMENT">("REFUND");
  const [returnMainReason, setReturnMainReason] = useState("");
  const [returnSubReason, setReturnSubReason] = useState("");
  const [returnComments, setReturnComments] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmPolicy, setConfirmPolicy] = useState(false);

  // Cancel Modal States
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelMainReason, setCancelMainReason] = useState("");
  const [cancelComments, setCancelComments] = useState("");

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
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate invoice PDF:", err);
      toast.error("Failed to download invoice.");
    }
  };

  const handleOpenCancelDialog = () => {
    setCancelMainReason("");
    setCancelComments("");
    setIsCancelOpen(true);
  };

  const handleSubmitCancel = async () => {
    if (!order) return;
    if (!cancelMainReason) {
      toast.error("Please select a reason for cancellation.");
      return;
    }
    setCancelling(true);

    try {
      const fullReason = `${cancelMainReason}${cancelComments ? ` : ${cancelComments}` : ""}`;
      const res = await cancelOrder(order.id, fullReason);
      if (res.success) {
        toast.success("Order cancelled successfully!");
        setOrder((prev: any) => ({
          ...prev,
          status: "Cancelled",
          payment_status: "Cancelled"
        }));
        setIsCancelOpen(false);
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
    setReturnStep(1);
    setReturnMainReason("");
    setReturnSubReason("");
    setReturnComments("");
    setUploadedImages([]);
    setConfirmPolicy(false);
    setBankDetails({ bankName: "", accountName: "", accountNumber: "", ifscCode: "" });
    setIsReturnOpen(true);
  };

  const handleReturnImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (uploadedImages.length + files.length > 3) {
      toast.error("You can upload up to 3 images only.");
      return;
    }

    setUploadingImage(true);
    try {
      const newImages = [...uploadedImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast.error("Please upload image files only");
          continue;
        }
        const fileName = `returns/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const { data, error } = await supabase.storage
          .from("review-images")
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("review-images")
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }
      setUploadedImages(newImages);
      toast.success("Photos uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeReturnImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReturn = async () => {
    if (!returnMainReason) {
      toast.error("Please select a reason for return.");
      return;
    }
    if (returnMainReason === "Product is damaged / broken" && uploadedImages.length === 0) {
      toast.error("Please upload at least one image showing the damage.");
      return;
    }
    if (!confirmPolicy) {
      toast.error("Please confirm the return conditions.");
      return;
    }
    if (!order) return;

    if (returnType === "REFUND" && order.payment_method === "COD") {
      if (!bankDetails.bankName || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
        toast.error("Please fill all bank details for the refund.");
        return;
      }
    }

    setReturnSubmitting(true);
    try {
      const fullReason = `Resolution: ${returnType} | ${returnMainReason}${returnSubReason ? ` - ${returnSubReason}` : ""}${returnComments ? ` : ${returnComments}` : ""}${uploadedImages.length > 0 ? ` (Damage Photos: ${uploadedImages.join(", ")})` : ""}`;
      
      if (returnType === "REPLACEMENT") {
        const res = await requestOrderReplacement(order.id, fullReason);
        if (res.success) {
          toast.success("Replacement requested successfully!");
          setOrder((prev: any) => ({
            ...prev,
            status: "REPLACEMENT_REQUESTED"
          }));
          setIsReturnOpen(false);
        } else {
          toast.error(res.error || "Failed to process replacement.");
        }
      } else {
        const res = await returnOrder(order.id, fullReason, order.payment_method === "COD" ? bankDetails : undefined);
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
        <Link prefetch={false} href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-red-600 transition-colors">
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
          <Link prefetch={false} href="/account/orders">
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
        <Link prefetch={false} href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-red-600 transition-colors">
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
                <span className="text-xl font-bold text-zinc-900">
                  {parseFloat(order.total_amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
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
                    onClick={handleOpenCancelDialog}
                    disabled={cancelling}
                    variant="outline"
                    className="border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-655 hover:border-red-100 text-xs h-9 px-4 rounded-lg font-semibold transition-colors"
                  >
                    Cancel Order
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

                {["delivered", "returned", "return_requested", "return_approved", "refund_pending", "refunded"].includes(order.status?.toLowerCase()) && (
                  <Button
                    onClick={() => handleDownloadInvoice(order)}
                    variant="outline"
                    className="border-zinc-200 text-zinc-650 hover:bg-zinc-50 text-xs h-9 px-4 rounded-lg font-semibold transition-colors inline-flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Download Invoice
                  </Button>
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
                  <Link prefetch={false} href={`/track-order?orderId=${getDisplayOrderId(order.id, order.created_at)}`} className="inline-block mt-3">
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
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {order.order_items?.map((item: any) => {
                    const isReviewed = reviewedProductIds.has(item.products?.id);
                    const quantity = item.quantity;
                    const unitPrice = parseFloat(item.unit_price);
                    const itemTotal = quantity * unitPrice;
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
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-900 line-clamp-2 pr-2">
                              {item.products?.name || "Deleted Product"}
                            </span>
                            {item.variants?.attributes && Object.keys(item.variants.attributes).length > 0 && (
                              <div className="text-[10px] text-zinc-500 font-medium mt-0.5 flex flex-wrap gap-1">
                                {Object.entries(item.variants.attributes).map(([k, v]) => (
                                  <span key={k} className="bg-zinc-100 px-1.5 py-0.5 rounded-sm border border-zinc-200/60">
                                    {k}: <span className="text-zinc-700 font-bold">{String(v)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
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
                        {item.variants?.attributes && Object.keys(item.variants.attributes).length > 0 && (
                          <div className="text-[10px] text-zinc-500 font-medium mt-0.5 flex flex-wrap gap-1">
                            {Object.entries(item.variants.attributes).map(([k, v]) => (
                              <span key={k} className="bg-zinc-100 px-1.5 py-0.5 rounded-sm border border-zinc-200/60">
                                {k}: <span className="text-zinc-700 font-bold">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}
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
              const totalAmt = parseFloat(order.total_amount || 0);
              const shipAmt = parseFloat(order.shipping_amount || 0);
              const discAmt = parseFloat(order.discount_amount || 0);

              let cgstAmt = parseFloat(order.cgst_amount || 0);
              let sgstAmt = parseFloat(order.sgst_amount || 0);
              let igstAmt = parseFloat(order.igst_amount || 0);
              let baseSubtotal = 0;
              
              let orderCgstRate = 0;
              let orderSgstRate = 0;
              let orderIgstRate = 0;

              // Fallback calculation for older orders that don't have split tax recorded
              const hasSplitTax = (cgstAmt + sgstAmt + igstAmt) > 0;
              let fallbackCgst = 0;
              let fallbackSgst = 0;
              let fallbackIgst = 0;

              order.order_items?.forEach((item: any) => {
                const quantity = item.quantity;
                const unitPrice = parseFloat(item.unit_price);
                const itemTotal = quantity * unitPrice;
                const igstRate = item.products?.igst_rate || 0;
                const cgstRate = item.products?.cgst_rate || 0;
                const sgstRate = item.products?.sgst_rate || 0;
                const rate = igstRate > 0 ? igstRate : (cgstRate + sgstRate);
                const isTaxInclusive = item.products?.is_tax_inclusive || false;

                if (igstRate > 0) orderIgstRate = igstRate;
                if (cgstRate > 0) orderCgstRate = cgstRate;
                if (sgstRate > 0) orderSgstRate = sgstRate;

                let itemTax = 0;
                let itemBase = itemTotal;

                if (rate > 0) {
                  if (isTaxInclusive) {
                    itemBase = itemTotal / (1 + rate / 100);
                    itemTax = itemTotal - itemBase;
                  } else {
                    itemTax = itemTotal * (rate / 100);
                  }

                  if (!hasSplitTax) {
                    if (igstRate > 0) {
                      fallbackIgst += itemTax;
                    } else {
                      const totalCgstSgst = cgstRate + sgstRate;
                      if (totalCgstSgst > 0) {
                        fallbackCgst += itemTax * (cgstRate / totalCgstSgst);
                        fallbackSgst += itemTax * (sgstRate / totalCgstSgst);
                      }
                    }
                  }
                }
                baseSubtotal += itemBase;
              });

              if (!hasSplitTax) {
                cgstAmt = fallbackCgst;
                sgstAmt = fallbackSgst;
                igstAmt = fallbackIgst;
              }

              let actualTax = cgstAmt + sgstAmt + igstAmt;

              // Determine if Shipping GST was applied and deduct it from display CGST/SGST/IGST
              let shippingGst = 0;
              const expectedShipGst = shipAmt * 0.18;
              if (expectedShipGst > 0) {
                if (hasSplitTax) {
                  if (igstAmt > 0 && igstAmt >= expectedShipGst - 0.1) {
                    shippingGst = expectedShipGst;
                    igstAmt -= shippingGst;
                  } else if (cgstAmt > 0 && cgstAmt >= (expectedShipGst / 2) - 0.1) {
                    shippingGst = expectedShipGst;
                    cgstAmt -= shippingGst / 2;
                    sgstAmt -= shippingGst / 2;
                  }
                  actualTax = cgstAmt + sgstAmt + igstAmt;
                } else {
                  // Fallback heuristic if it was calculated purely on items
                  if (baseSubtotal === 0 && totalAmt > 0) {
                    const rawTaxAmt = parseFloat(order.tax_amount || 0);
                    baseSubtotal = totalAmt - rawTaxAmt - shipAmt + discAmt;
                  }
                  const tempExpectedTotal = baseSubtotal + actualTax + shipAmt - discAmt;
                  const diff = totalAmt - tempExpectedTotal;
                  if (diff > 0 && Math.abs(diff - expectedShipGst) < 0.1) {
                    shippingGst = diff;
                  }
                }
              }

              if (baseSubtotal === 0 && totalAmt > 0) {
                // Fallback if no items found
                const rawTaxAmt = parseFloat(order.tax_amount || 0);
                baseSubtotal = totalAmt - rawTaxAmt - shipAmt + discAmt;
              }

              // Clamp to prevent negative subtotals in edge cases
              baseSubtotal = Math.max(0, Math.round(baseSubtotal * 100) / 100);

              const expectedTotal = baseSubtotal + actualTax + shipAmt + shippingGst - discAmt;
              const diff = totalAmt - expectedTotal;
              const roundOff = diff;

              return (
                <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2.5 max-w-sm ml-auto mt-6">
                  <div className="flex justify-between text-xs font-bold text-zinc-500 pb-1 border-b border-zinc-200/60 mb-2">
                    <span>SUBTOTAL (EXCL. GST)</span>
                    <span>₹{baseSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {(actualTax > 0 || shipAmt > 0 || Math.abs(roundOff) > 0.01) && (
                    <details className="group">
                      <summary className="flex justify-between text-xs font-bold text-zinc-500 cursor-pointer list-none appearance-none outline-none">
                        <span className="flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span>
                          TOTAL FEE
                        </span>
                        <span>₹{(actualTax + shipAmt + shippingGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </summary>
                      <div className="pt-2 pb-1 space-y-1.5 ml-3">
                        {cgstAmt > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>CGST {orderCgstRate > 0 ? `(${orderCgstRate}%)` : ''}</span>
                            <span>₹{cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {sgstAmt > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>SGST {orderSgstRate > 0 ? `(${orderSgstRate}%)` : ''}</span>
                            <span>₹{sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {igstAmt > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>IGST {orderIgstRate > 0 ? `(${orderIgstRate}%)` : ''}</span>
                            <span>₹{igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {shipAmt > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>DELIVERY CHARGE</span>
                            <span>₹{shipAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {shippingGst > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>SHIPPING GST (18%)</span>
                            <span>+₹{shippingGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    </details>
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
        <DialogContent className="sm:max-w-lg bg-white border border-zinc-150 p-6 rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-900">Return Order</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Guided return request wizard (Step {returnStep} of 3)
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center justify-between my-4 px-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1 last:flex-initial">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  returnStep >= s ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                }`}>
                  {s}
                </div>
                <span className={`ml-1.5 text-[10px] font-bold uppercase tracking-wider ${returnStep >= s ? "text-zinc-900" : "text-zinc-400"} hidden sm:inline`}>
                  {s === 1 ? "Reason" : s === 2 ? "Refund" : "Confirm"}
                </span>
                {s < 3 && <div className={`flex-1 h-0.5 mx-3 ${returnStep > s ? "bg-red-600" : "bg-zinc-200"}`} />}
              </div>
            ))}
          </div>

          <div className="py-2 space-y-4">
            {/* STEP 1: Reason Selection */}
            {returnStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider block">Reason for return</label>
                  <select
                    value={returnMainReason}
                    onChange={(e) => {
                      setReturnMainReason(e.target.value);
                      setReturnSubReason("");
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  >
                    <option value="">Select a reason</option>
                    {Object.keys(RETURN_SUB_REASONS).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {returnMainReason && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider block">More Details</label>
                    <select
                      value={returnSubReason}
                      onChange={(e) => setReturnSubReason(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    >
                      <option value="">Select more details</option>
                      {RETURN_SUB_REASONS[returnMainReason]?.map((sr) => (
                        <option key={sr} value={sr}>{sr}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider block">Brief Comments / Issue Description</label>
                  <textarea
                    value={returnComments}
                    onChange={(e) => setReturnComments(e.target.value)}
                    placeholder="Provide additional details regarding the return..."
                    rows={3}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none"
                  />
                </div>

                {/* Photo upload for damaged product */}
                {returnMainReason === "Product is damaged / broken" && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider block flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Upload photos of damage (At least 1 required)</span>
                    </label>

                    {uploadedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {uploadedImages.map((url, idx) => (
                          <div key={idx} className="relative w-16 h-16 border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center p-1 group">
                            <img src={url} alt={`Damage preview ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                            <button
                              type="button"
                              onClick={() => removeReturnImage(idx)}
                              className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all scale-75 shadow-sm"
                              title="Remove Image"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {uploadedImages.length < 3 && (
                      <label className="flex items-center justify-center gap-2 w-full h-11 border border-dashed border-zinc-300 rounded-xl hover:border-zinc-950 hover:bg-zinc-50/50 transition-all cursor-pointer">
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-500">Upload Photos (Max 3)</span>
                          </>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleReturnImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
                   {/* STEP 2: Resolution & Details */}
            {returnStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider block">Desired Resolution</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReturnType("REFUND")}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer",
                        returnType === "REFUND"
                          ? "border-red-600 bg-red-50/30 text-red-950 font-bold"
                          : "border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50"
                      )}
                    >
                      <span className="text-sm">Refund</span>
                      <span className="text-[10px] text-zinc-400 mt-1">Get money back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnType("REPLACEMENT")}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer",
                        returnType === "REPLACEMENT"
                          ? "border-red-600 bg-red-50/30 text-red-950 font-bold"
                          : "border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50"
                      )}
                    >
                      <span className="text-sm">Replacement</span>
                      <span className="text-[10px] text-zinc-400 mt-1">Get same product</span>
                    </button>
                  </div>
                </div>

                {returnType === "REFUND" ? (
                  <>
                    {order.payment_method === "COD" ? (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 leading-normal">
                          ℹ️ This order was paid via Cash on Delivery. Please enter your bank account details below to process the manual refund.
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider block">Bank Name</label>
                          <Input
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                            placeholder="e.g. State Bank of India"
                            className="rounded-xl border-zinc-200 h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider block">Account Holder Name</label>
                          <Input
                            value={bankDetails.accountName}
                            onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                            placeholder="Name as per Bank Account"
                            className="rounded-xl border-zinc-200 h-10 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider block">Account Number</label>
                            <Input
                              type="password"
                              value={bankDetails.accountNumber}
                              onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                              placeholder="Account Number"
                              className="rounded-xl border-zinc-200 h-10 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider block">IFSC Code</label>
                            <Input
                              value={bankDetails.ifscCode}
                              onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                              placeholder="IFSC Code"
                              className="rounded-xl border-zinc-200 uppercase h-10 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 leading-normal space-y-1 animate-in fade-in duration-200">
                        <p className="font-bold">Refund method: Original Source Payment</p>
                        <p>Since this was a prepaid order, the refund will be automatically routed back to your original source of payment (Razorpay Netbanking/UPI/Card) after approval.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-normal space-y-1 animate-in fade-in duration-200">
                    <p className="font-bold">Replacement Method: Free Replacement Unit</p>
                    <p>A fresh replacement unit of the same product will be shipped to your address free of charge after the reverse pickup of your return item is completed.</p>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider block">Confirm Reverse Pickup Address</label>
                  <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl text-xs text-zinc-650 leading-relaxed font-semibold">
                    {order.shipping_address}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Summary and Submission */}
            {returnStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2.5 text-xs text-zinc-650 font-semibold">
                  <div className="flex justify-between items-start">
                    <span className="text-zinc-400">Reason:</span>
                    <span className="text-zinc-900 font-bold text-right max-w-[200px]">{returnMainReason}</span>
                  </div>
                  {returnSubReason && (
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400">Sub-Reason:</span>
                      <span className="text-zinc-900 font-bold text-right max-w-[200px]">{returnSubReason}</span>
                    </div>
                  )}
                  {returnComments && (
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400">Comments:</span>
                      <span className="text-zinc-800 text-right max-w-[200px] truncate">{returnComments}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start border-t border-zinc-200/60 pt-2">
                    <span className="text-zinc-400">Resolution:</span>
                    <span className="text-zinc-900 font-bold capitalize">
                      {returnType.toLowerCase()}
                    </span>
                  </div>
                  {returnType === "REFUND" ? (
                    <div className="flex justify-between items-start border-t border-zinc-200/60 pt-2">
                      <span className="text-zinc-400">Refund Destination:</span>
                      <span className="text-zinc-900 font-bold text-right max-w-[200px]">
                        {order.payment_method === "COD" ? `Bank Payout (${bankDetails.bankName})` : "Original Payment Source"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start border-t border-zinc-200/60 pt-2">
                      <span className="text-zinc-400">Replacement Delivery:</span>
                      <span className="text-zinc-900 font-bold text-right max-w-[200px]">
                        {order.shipping_address}
                      </span>
                    </div>
                  )}
                  {uploadedImages.length > 0 && (
                    <div className="border-t border-zinc-200/60 pt-2 space-y-1.5">
                      <span className="text-zinc-400">Damage Photos ({uploadedImages.length}):</span>
                      <div className="flex gap-2">
                        {uploadedImages.map((img, idx) => (
                          <div key={idx} className="w-12 h-12 border border-zinc-200 rounded-lg overflow-hidden bg-white p-0.5">
                            <img src={img} alt="Damage thumbnail" className="w-full h-full object-contain" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-1.5 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="confirm_conditions"
                    checked={confirmPolicy}
                    onChange={(e) => setConfirmPolicy(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-950 border-zinc-300 focus:ring-0 focus:ring-offset-0 mt-0.5 cursor-pointer accent-zinc-900"
                  />
                  <label htmlFor="confirm_conditions" className="text-xs font-semibold text-zinc-500 cursor-pointer select-none leading-relaxed">
                    I confirm that the product is unused, in original packaging, with all accessories and price tags intact.
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 border-t border-zinc-100 pt-4">
            {returnStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setReturnStep(prev => prev - 1)}
                className="w-full sm:w-auto rounded-xl border-zinc-200 text-xs font-bold"
                disabled={returnSubmitting}
              >
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReturnOpen(false)}
              className="w-full sm:w-auto rounded-xl border-zinc-200 text-xs font-bold"
              disabled={returnSubmitting}
            >
              Cancel
            </Button>
            
            {returnStep < 3 ? (
              <Button
                type="button"
                onClick={() => setReturnStep(prev => prev + 1)}
                disabled={
                  (returnStep === 1 && (!returnMainReason || !returnSubReason || !returnComments.trim() || (returnMainReason === "Product is damaged / broken" && uploadedImages.length === 0))) ||
                  (returnStep === 2 && returnType === "REFUND" && order.payment_method === "COD" && (!bankDetails.bankName || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode))
                }
                className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmitReturn}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
                disabled={returnSubmitting || !confirmPolicy}
              >
                {returnSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting
                  </>
                ) : (
                  returnType === "REPLACEMENT" ? "Request Replacement" : "Request Return"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-150 p-6 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-900">Cancel Order</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Please help us improve by letting us know why you are cancelling.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider block">Reason for cancellation</label>
              <select
                value={cancelMainReason}
                onChange={(e) => setCancelMainReason(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                <option value="">Select a reason</option>
                <option value="Incorrect shipping address">Incorrect shipping address</option>
                <option value="Price has decreased / found a better deal">Price has decreased / found a better deal</option>
                <option value="Placed by mistake / changed my mind">Placed by mistake / changed my mind</option>
                <option value="Expected delivery time is too long">Expected delivery time is too long</option>
                <option value="Ordered incorrect product / variant">Ordered incorrect product / variant</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider block">Comments (Optional)</label>
              <textarea
                value={cancelComments}
                onChange={(e) => setCancelComments(e.target.value)}
                placeholder="Provide additional details regarding the cancellation..."
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 border-t border-zinc-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelOpen(false)}
              className="w-full sm:w-auto rounded-xl border-zinc-200 text-xs font-bold"
              disabled={cancelling}
            >
              Close
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              onClick={handleSubmitCancel}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
              disabled={cancelling || !cancelMainReason}
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Cancelling
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
