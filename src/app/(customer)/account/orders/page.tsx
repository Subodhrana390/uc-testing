"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Truck, ChevronRight, Search, Download, Box, Clock, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

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
import { cancelOrder, returnOrder } from "@/app/actions/orders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"current" | "archived">("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Return Modal State
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnOrderPaymentMethod, setReturnOrderPaymentMethod] = useState<string | null>(null);
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

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancellingOrderId(orderId);

    try {
      const res = await cancelOrder(orderId);

      if (res.success) {
        toast.success("Order cancelled successfully!");
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Cancelled", payment_status: "Cancelled" } : o));
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
    setReturnReason("");
    setBankDetails({ bankName: "", accountName: "", accountNumber: "", ifscCode: "" });
    setIsReturnOpen(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      toast.error("Please enter a reason for your return.");
      return;
    }
    if (!returnOrderId) return;

    if (returnOrderPaymentMethod === 'COD') {
      if (!bankDetails.bankName || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
        toast.error("Please fill all bank details for the refund.");
        return;
      }
    }

    setReturnSubmitting(true);
    try {
      const res = await returnOrder(returnOrderId, returnReason, returnOrderPaymentMethod === 'COD' ? bankDetails : undefined);
      if (res.success) {
        toast.success("Return requested successfully!");
        setOrders(prev => prev.map(o => o.id === returnOrderId ? { ...o, status: "RETURN_REQUESTED", payment_status: "Refund Pending" } : o));
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



  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
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
          .eq("customer_email", user.email)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error: any) {
        toast.error(error.message || "Error fetching orders");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [supabase, refreshKey]);

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
            onClick={() => { setLoading(true); setRefreshKey(prev => prev + 1); }}
            variant="outline"
            className="h-9 gap-1.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "current" | "archived")}>
            <TabsList className="bg-zinc-100 rounded-lg h-9">
              <TabsTrigger value="current" className="text-xs font-medium rounded-md px-4 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                Active Orders
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs font-medium rounded-md px-4 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
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
                    <span className="text-[10px] font-medium text-indigo-500 uppercase tracking-wider block">Est. Delivery</span>
                    <span className="text-sm font-medium text-indigo-600 flex items-center gap-1 mt-0.5">
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
                      onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                      disabled={cancellingOrderId === order.id}
                      variant="outline"
                      className="border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-xs h-8 px-3.5 rounded-lg font-medium transition-colors"
                    >
                      {cancellingOrderId === order.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Cancelling</>
                      ) : "Cancel"}
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
                      className="h-8 rounded-lg flex items-center justify-center gap-1.5 px-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      Track
                    </button>
                  )}

                  <Badge variant={getStatusVariant(order.status)} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize border-0 shadow-none">
                    {getStatusLabel(order.status)}
                  </Badge>

                  <button
                    disabled={order.status?.toLowerCase() !== "delivered"}
                    onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(order); }}
                    title={order.status?.toLowerCase() === "delivered" ? "Download Invoice" : "Invoice will generate after delivery"}
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                      order.status?.toLowerCase() === "delivered"
                        ? "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 active:scale-95"
                        : "text-zinc-300 cursor-not-allowed"
                    )}
                  >
                    <Download className="w-4 h-4" />
                  </button>

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
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-6 text-sm">
                  Start Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>



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
            {returnOrderPaymentMethod === 'COD' && (
              <div className="space-y-4 pt-4 border-t border-zinc-100 mt-4">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Refund Bank Details</h4>
                  <p className="text-xs text-zinc-500 mb-4">Since this is a COD order, please provide your bank details for the refund. Cash refunds take 2-3 business days to be processed and credited to your bank account.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Bank Name</label>
                    <Input value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} placeholder="e.g. State Bank of India" className="rounded-xl border-zinc-200" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Account Holder Name</label>
                    <Input value={bankDetails.accountName} onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })} placeholder="Name as per bank account" className="rounded-xl border-zinc-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Account Number</label>
                      <Input type="password" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} placeholder="Account Number" className="rounded-xl border-zinc-200" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">IFSC Code</label>
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
              className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl"
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
