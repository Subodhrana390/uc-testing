"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Truck, ChevronRight, Search, Box, Clock, CheckCircle2, Loader2, RefreshCw, Camera, Upload, X } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/format";
import { getDisplayOrderId, getReturnWindowInfo } from "@/lib/order";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { loadRazorpayScript } from "@/lib/razorpay";
import { cancelOrder, returnOrder, requestOrderReplacement } from "@/app/actions/orders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useOrders } from "@/hooks/api/useOrders";

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

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"current" | "archived">("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Return Modal State
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnOrderPaymentMethod, setReturnOrderPaymentMethod] = useState<string | null>(null);
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
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelMainReason, setCancelMainReason] = useState("");
  const [cancelComments, setCancelComments] = useState("");

  const supabase = createClient();

  const handlePayOnline = async (order: any) => {
    if (typeof window === "undefined") return;
    setPayingOrderId(order.id);

    try {
      // 1. Ensure Razorpay script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Failed to load Razorpay SDK. Please check your internet connection or disable ad-blockers.");
      }

      // 2. Fetch Razorpay Order from server api
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
        throw new Error(errData.error || "Failed to initialize Razorpay order");
      }

      const razorpayOrder = await orderRes.json();

      // 3. Update Supabase order with Razorpay Order ID
      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ razorpay_order_id: razorpayOrder.id })
        .eq("id", order.id);

      if (updateOrderError) {
        console.error("Failed to associate Razorpay Order ID:", updateOrderError);
      }

      // 4. Open Razorpay checkout
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
            // Update order status/payment in Supabase
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
              // Update local state
              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: "Paid", payment_method: "ONLINE" } : o));
            } else {
              toast.error("Failed to register payment. Please contact support.");
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

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Error initiating payment.");
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleOpenCancelDialog = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelMainReason("");
    setCancelComments("");
    setIsCancelOpen(true);
  };

  const handleSubmitCancel = async () => {
    if (!cancelOrderId) return;
    if (!cancelMainReason) {
      toast.error("Please select a reason for cancellation.");
      return;
    }
    setCancellingOrderId(cancelOrderId);

    try {
      const fullReason = `${cancelMainReason}${cancelComments ? ` : ${cancelComments}` : ""}`;
      const res = await cancelOrder(cancelOrderId, fullReason);

      if (res.success) {
        toast.success("Order cancelled successfully!");
        setOrders(prev => prev.map(o => o.id === cancelOrderId ? { ...o, status: "Cancelled", payment_status: "Cancelled" } : o));
        setIsCancelOpen(false);
      } else {
        toast.error(res.error || "Failed to cancel order");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleOpenReturnDialog = (order: any) => {
    setReturnOrderId(order.id);
    setReturnOrderPaymentMethod(order.payment_method);
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
    if (!returnOrderId) return;

    if (returnType === "REFUND" && returnOrderPaymentMethod === 'COD') {
      if (!bankDetails.bankName || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
        toast.error("Please fill all bank details for the refund.");
        return;
      }
    }

    setReturnSubmitting(true);
    try {
      const fullReason = `Resolution: ${returnType} | ${returnMainReason}${returnSubReason ? ` - ${returnSubReason}` : ""}${returnComments ? ` : ${returnComments}` : ""}${uploadedImages.length > 0 ? ` (Damage Photos: ${uploadedImages.join(", ")})` : ""}`;
      
      if (returnType === "REPLACEMENT") {
        const res = await requestOrderReplacement(returnOrderId, fullReason);
        if (res.success) {
          toast.success("Replacement requested successfully!");
          setOrders(prev => prev.map(o => o.id === returnOrderId ? { ...o, status: "REPLACEMENT_REQUESTED" } : o));
          setIsReturnOpen(false);
        } else {
          toast.error(res.error || "Failed to process replacement.");
        }
      } else {
        const res = await returnOrder(returnOrderId, fullReason, returnOrderPaymentMethod === 'COD' ? bankDetails : undefined);
        if (res.success) {
          toast.success("Return requested successfully!");
          setOrders(prev => prev.map(o => o.id === returnOrderId ? { ...o, status: "RETURN_REQUESTED", payment_status: "Refund Pending" } : o));
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





  const { data: fetchedOrders, isLoading: loading, refetch: refreshOrders } = useOrders();
  
  useEffect(() => {
    if (fetchedOrders) {
      setOrders(fetchedOrders);
    }
  }, [fetchedOrders]);



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
    // Legacy (kept for old orders still in DB)
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

  const filteredOrders = orders.filter((order) => {
    const s = order.status?.toLowerCase();
    const isArchived = s === "delivered" || s === "cancelled" || s === "refunded";
    const isTabMatch = activeTab === "current" ? !isArchived : isArchived;

    if (!isTabMatch) return false;
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const customId = getDisplayOrderId(order.id, order.created_at).toLowerCase();
    const hasProductMatch = order.order_items?.some((item: any) =>
      item.products?.name?.toLowerCase().includes(query)
    );

    return customId.includes(query) || hasProductMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Order History</h1>
          <p className="text-sm text-zinc-500 mt-1">Review and track your recent and past orders</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => refreshOrders()}
            variant="outline"
            className="h-9 gap-1.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "current" | "archived")}>
            <TabsList className="bg-zinc-100 rounded-lg h-9">
              <TabsTrigger value="current" className="text-xs font-medium rounded-md px-4 data-[active]:bg-white data-[active]:text-red-600 data-[active]:shadow-sm">
                Active Orders
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs font-medium rounded-md px-4 data-[active]:bg-white data-[active]:text-red-600 data-[active]:shadow-sm">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search by Order ID or Item Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 border-zinc-200"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="group border-zinc-100 overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">

            {/* Order Meta Info Header */}
            <div
              onClick={() => router.push(`/account/orders/${order.id}`)}
              className="bg-white cursor-pointer px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none transition-colors hover:bg-zinc-50/30"
            >
              {/* Info Group */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-8">
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Order ID</span>
                  <span className="text-sm font-semibold text-zinc-800">{getDisplayOrderId(order.id, order.created_at)}</span>
                </div>

                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Placed On</span>
                  <span className="text-sm font-medium text-zinc-600">
                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Total Amount</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-zinc-900">{formatCurrency(order.total_amount)}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium capitalize",
                      order.payment_status?.toLowerCase() === "paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    )}>
                      {order.payment_status || "Unpaid"}
                    </span>
                  </div>
                </div>

                {order.delivery_estimate && order.status?.toLowerCase() !== "delivered" && (
                  <div>
                    <span className="text-[10px] font-medium text-red-500 uppercase tracking-wider block">Est. Delivery</span>
                    <span className="text-sm font-medium text-red-600 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" /> {order.delivery_estimate}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons & Status Group */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t border-zinc-100 sm:border-0">
                <div className="flex items-center gap-2">
                  {order.payment_status?.toLowerCase() !== "paid" && ["pending", "placed", "confirmed"].includes(order.status?.toLowerCase()) && (
                    <Button
                      onClick={(e) => { e.stopPropagation(); handlePayOnline(order); }}
                      disabled={payingOrderId === order.id}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-8 px-3.5 rounded-lg shadow-sm font-medium transition-colors"
                    >
                      {payingOrderId === order.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Processing</>
                      ) : "Pay Online"}
                    </Button>
                  )}

                  {["pending", "placed", "confirmed", "processing"].includes(order.status?.toLowerCase()) && (
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleOpenCancelDialog(order.id); }}
                      disabled={cancellingOrderId === order.id}
                      variant="outline"
                      className="border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-655 hover:border-red-100 text-xs h-8 px-3.5 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </Button>
                  )}

                  {(() => {
                    const { isReturnable, daysRemaining } = getReturnWindowInfo(order);
                    if (order.status?.toLowerCase() === "delivered") {
                      if (isReturnable) {
                        return (
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleOpenReturnDialog(order); }}
                            variant="outline"
                            className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs h-8 px-3.5 rounded-lg font-medium transition-colors"
                          >
                            Return ({daysRemaining}d left)
                          </Button>
                        );
                      } else {
                        return (
                          <span className="text-xs text-zinc-400 font-medium px-2 py-1 bg-zinc-50 border border-zinc-100 rounded-lg">
                            Return window expired
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                <div className="flex items-center gap-3">
                  {!["delivered", "cancelled", "returned", "refunded", "return_requested", "return_approved", "refund_pending"].includes(order.status?.toLowerCase()) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/track-order?orderId=${getDisplayOrderId(order.id, order.created_at)}`);
                      }}
                      title="Track Order"
                      className="h-8 rounded-lg flex items-center justify-center gap-1.5 px-3 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 active:scale-95 transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      Track
                    </button>
                  )}

                  <Badge variant={getStatusVariant(order.status)} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize border-0 shadow-none">
                    {getStatusLabel(order.status)}
                  </Badge>



                  <ChevronRight className="w-4 h-4 text-zinc-450 shrink-0" />
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <Card className="border-zinc-200 border-dashed">
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                <Box className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900">No orders found</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-1">No orders match your current filters.</p>
              </div>
              <Link href="/products">
                <Button className="bg-red-600 hover:bg-red-700 text-white h-9 px-6 text-sm">
                  Start Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>



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
                  returnStep >= s ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-450 border border-zinc-200"
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
                            <img src={url} alt={`Damage photo ${idx + 1}`} className="max-h-full max-w-full object-contain" />
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
                  <label className="text-xs font-bold text-zinc-455 uppercase tracking-wider block">Desired Resolution</label>
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
                    {returnOrderPaymentMethod === "COD" ? (
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
                    {orders.find(o => o.id === returnOrderId)?.shipping_address || "Shipping Address"}
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
                        {returnOrderPaymentMethod === "COD" ? `Bank Payout (${bankDetails.bankName})` : "Original Payment Source"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start border-t border-zinc-200/60 pt-2">
                      <span className="text-zinc-400">Replacement Delivery:</span>
                      <span className="text-zinc-900 font-bold text-right max-w-[200px]">
                        {orders.find(o => o.id === returnOrderId)?.shipping_address || "Shipping Address"}
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
                    id="confirm_conditions_list"
                    checked={confirmPolicy}
                    onChange={(e) => setConfirmPolicy(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-950 border-zinc-300 focus:ring-0 focus:ring-offset-0 mt-0.5 cursor-pointer accent-zinc-900"
                  />
                  <label htmlFor="confirm_conditions_list" className="text-xs font-semibold text-zinc-500 cursor-pointer select-none leading-relaxed">
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
                  (returnStep === 2 && returnType === "REFUND" && returnOrderPaymentMethod === "COD" && (!bankDetails.bankName || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode))
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
              disabled={cancellingOrderId !== null}
            >
              Close
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              onClick={handleSubmitCancel}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
              disabled={cancellingOrderId !== null || !cancelMainReason}
            >
              {cancellingOrderId !== null ? (
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
