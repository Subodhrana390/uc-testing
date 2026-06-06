"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Truck, ChevronRight, Search, Download, Box, Clock, CheckCircle2, Loader2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/format";
import { getDisplayOrderId } from "@/lib/order";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"current" | "archived">("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const supabase = createClient();

  const handlePayOnline = async (order: any) => {
    if (typeof window === "undefined") return;
    setPayingOrderId(order.id);

    try {
      // 1. Ensure Razorpay script is loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
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
      const { cancelOrder } = await import("@/app/actions/orders");
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
  }, [supabase]);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
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
    const isTabMatch = activeTab === "current"
      ? order.status !== "Delivered" && order.status !== "Cancelled"
      : order.status === "Delivered" || order.status === "Cancelled";

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
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
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
          <Card key={order.id} className="border-zinc-200 overflow-hidden hover:shadow-md transition-shadow">

            {/* Order Meta Info */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100">
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Order ID</span>
                  <span className="text-xs font-medium text-zinc-900">{getDisplayOrderId(order.id, order.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Placed On</span>
                  <span className="text-xs font-medium text-zinc-900">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Total</span>
                  <span className="text-xs font-semibold text-zinc-900">{formatCurrency(order.total_amount)}</span>
                  <span className="text-[9px] text-zinc-500 block uppercase tracking-tight mt-0.5">
                    {order.payment_method} • <span className={cn(order.payment_status?.toLowerCase() === "paid" ? "text-emerald-600 font-bold" : "text-amber-600 font-bold")}>{order.payment_status || "Unpaid"}</span>
                  </span>
                </div>
                {order.delivery_estimate && order.status !== "Delivered" && (
                  <div>
                    <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider block">Est. Delivery</span>
                    <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {order.delivery_estimate}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {order.payment_method?.toUpperCase() === "COD" && order.payment_status?.toLowerCase() !== "paid" && order.status?.toLowerCase() !== "cancelled" && (
                  <Button
                    onClick={() => handlePayOnline(order)}
                    disabled={payingOrderId === order.id}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] h-7 px-3 rounded-md shadow-sm font-semibold uppercase tracking-wider"
                  >
                    {payingOrderId === order.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Processing
                      </>
                    ) : (
                      "Pay Online"
                    )}
                  </Button>
                )}
                {["pending", "placed", "confirmed"].includes(order.status?.toLowerCase()) && (
                  <Button
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancellingOrderId === order.id}
                    variant="outline"
                    className="border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 text-[10px] h-7 px-3 rounded-md shadow-sm font-semibold uppercase tracking-wider"
                  >
                    {cancellingOrderId === order.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Cancelling
                      </>
                    ) : (
                      "Cancel"
                    )}
                  </Button>
                )}
                <Badge variant={getStatusVariant(order.status)} className="text-[10px] uppercase tracking-wider">
                  {order.status}
                </Badge>
                <button className="h-7 w-7 rounded-md hover:bg-zinc-200 flex items-center justify-center transition-colors">
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Items List */}
            <CardContent className="py-4 space-y-4">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-lg relative shrink-0 overflow-hidden border border-zinc-100">
                    <Image
                      src={item.products?.image_url || "/images/placeholder.png"}
                      alt={item.products?.name}
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-zinc-900 line-clamp-1">{item.products?.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="secondary" className="text-[10px] h-5">Qty: {item.quantity}</Badge>
                      <span className="text-xs text-zinc-500">{formatCurrency(item.unit_price)} per unit</span>
                    </div>
                  </div>

                  <Link href={`/track-order?orderId=${getDisplayOrderId(order.id, order.created_at)}`} className="sm:w-fit">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs h-8">
                      View Progress <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>

            {/* Shipping Live Banner */}
            {order.status === "Shipped" && (
              <div className="px-4 sm:px-6 py-4 bg-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-700 rounded-lg">
                    <Truck className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-zinc-350 uppercase tracking-wider">In Transit</p>
                    <p className="text-sm font-medium">{order.carrier || "Standard"} — <span className="font-mono text-zinc-200">{order.tracking_id || "UPDATING"}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-indigo-750 px-3 py-1.5 rounded-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-200">Live</span>
                </div>
              </div>
            )}
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
    </div>
  );
}