"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import {
  ChevronLeft,
  CreditCard,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  Truck,
} from "lucide-react";

import { Input } from "@/components/ui/input";

import {
  getCartItems,
  getCartTotal,
  clearCart,
  type CartItem,
} from "@/lib/cart";

import { formatCurrency } from "@/lib/format";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { getDisplayOrderId } from "@/lib/order";
import { loadRazorpayScript } from "@/lib/razorpay";
import { deleteFailedOrder } from "@/app/actions/orders";
import { env } from "@/env";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CartItemWithTax extends CartItem {
  tax_rate?: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<CartItemWithTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] =
    useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<
    "COD" | "ONLINE"
  >("ONLINE");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const subtotal = getCartTotal();

  const taxTotal = items.reduce((acc, item) => {
    const rate = item.tax_rate || 0;

    return (
      acc +
      item.price * item.quantity * (rate / 100)
    );
  }, 0);

  const grandTotal = subtotal + taxTotal;

  useEffect(() => {
    const cartItems = getCartItems();

    if (cartItems.length === 0) {
      router.push("/cart");
      return;
    }

    async function fetchData() {
      loadRazorpayScript();

      const {
        data: { user },
      } = await (supabase.auth as any).getUser();

      if (!user) {
        toast.error("Please login to proceed");

        router.push("/login?returnTo=/checkout");

        return;
      }

      const { data: products } = await supabase
        .from("products")
        .select("id, tax_rate")
        .in(
          "id",
          cartItems.map((i) => i.id)
        );

      const itemsWithTax = cartItems.map((item) => {
        const prod = products?.find(
          (p: any) => p.id === item.id
        );

        return {
          ...item,
          tax_rate: prod?.tax_rate || 0,
        };
      });

      setItems(itemsWithTax);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setForm((prev) => ({
          ...prev,
          fullName:
            profile.full_name ||
            user.user_metadata?.full_name ||
            "",

          email:
            profile.email || user.email || "",

          phone: profile.phone || "",
        }));
      }

      const { data: addrData } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", {
          ascending: false,
        });

      if (addrData && addrData.length > 0) {
        setAddresses(addrData);

        const defaultAddr =
          addrData.find(
            (a: any) => a.is_default
          ) || addrData[0];

        setSelectedAddressId(defaultAddr.id);

        setForm((prev) => ({
          ...prev,
          address: `${defaultAddr.address_line1}${defaultAddr.address_line2
            ? ", " +
            defaultAddr.address_line2
            : ""
            }`,
          city: defaultAddr.city || "",
          state: defaultAddr.state || "",
          postalCode:
            defaultAddr.postal_code || "",
        }));
      }

      setLoading(false);
    }

    fetchData();
  }, [router, supabase]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);

    setForm((prev) => ({
      ...prev,
      address: `${addr.address_line1}${addr.address_line2
        ? ", " + addr.address_line2
        : ""
        }`,
      city: addr.city || "",
      state: addr.state || "",
      postalCode: addr.postal_code || "",
    }));
  };

  const [deliveryEstimate, setDeliveryEstimate] = useState<{
    days: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (form.postalCode.length === 6) {
      const resolveDelivery = async () => {
        try {
          // 1. Check direct override
          const { data: pinData } = await supabase
            .from("delivery_pincodes")
            .select("*, delivery_zones(*)")
            .eq("pincode", form.postalCode)
            .eq("active", true)
            .maybeSingle();

          let estimateDays = "";
          if (pinData) {
            estimateDays = pinData.estimate_override || pinData.delivery_zones?.estimate || "3-5 Days";
          } else {
            // 2. Load zones
            const { data: zones } = await supabase
              .from("delivery_zones")
              .select("*")
              .eq("active", true);

            const prefix = form.postalCode.substring(0, 2);
            let matchedZone = zones?.find(z => {
              const prefixes = z.coverage.split(",").map((p: string) => p.trim());
              return prefixes.includes(prefix);
            });

            if (!matchedZone) {
              matchedZone = zones?.find(z => 
                z.coverage.toLowerCase().includes("pan india") || 
                z.name.toLowerCase().includes("rest of india")
              );
            }

            estimateDays = matchedZone?.estimate || "5-7 Days";
          }

          // 3. Resolve estimated date (parse numbers from estimate description)
          let daysToAdd = 5;
          const matchDays = estimateDays.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:day|working|business)/i);
          const matchHours = estimateDays.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*hour/i);

          if (matchDays) {
            daysToAdd = matchDays[2] ? parseInt(matchDays[2]) : parseInt(matchDays[1]);
          } else if (matchHours) {
            const hours = matchHours[2] ? parseInt(matchHours[2]) : parseInt(matchHours[1]);
            daysToAdd = Math.ceil(hours / 24);
          } else {
            if (estimateDays.toLowerCase().includes("24 hours") || estimateDays.toLowerCase().includes("same day")) {
              daysToAdd = 1;
            } else if (estimateDays.toLowerCase().includes("48 hours")) {
              daysToAdd = 2;
            }
          }

          // Fetch global safety buffer from settings
          const { data: bufferSetting } = await supabase
            .from("delivery_settings")
            .select("value")
            .eq("key", "global_safety_buffer")
            .maybeSingle();
          
          const safetyBuffer = bufferSetting ? parseInt(bufferSetting.value) || 0 : 0;
          
          const d = new Date();
          d.setDate(d.getDate() + daysToAdd + safetyBuffer);

          setDeliveryEstimate({
            days: estimateDays,
            date: d.toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })
          });
        } catch (err) {
          console.error("Error resolving delivery:", err);
          const d = new Date();
          d.setDate(d.getDate() + 7);
          setDeliveryEstimate({
            days: "5-7 Days",
            date: d.toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })
          });
        }
      };

      resolveDelivery();
    } else {
      setDeliveryEstimate(null);
    }
  }, [form.postalCode, supabase]);

  const handlePlaceOrder = async (
    e: React.FormEvent
  ) => {
    if (e) e.preventDefault();

    if (
      !form.fullName ||
      !form.phone ||
      !form.address ||
      !form.city ||
      !form.postalCode
    ) {
      toast.error(
        "Please fill all required fields"
      );

      return;
    }

    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    setSubmitting(true);

    // Track if an order was created so the catch block can clean it up
    let createdOrderId: string | null = null;

    try {
      const { createOrder } = await import("@/app/actions/orders");

      if (paymentMethod === "ONLINE") {
        // Ensure Razorpay script is loaded
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error("Failed to load Razorpay SDK. Please check your internet connection or disable ad-blockers.");
        }

        // 1. Create order in Supabase as Unpaid
        const res = await createOrder({
          ...form,
          items,
          total: grandTotal,
          paymentMethod: "ONLINE",
          deliveryEstimate: deliveryEstimate?.date,
          paymentStatus: "Unpaid"
        });

        if (!res?.success || !res?.orderId) {
          throw new Error(res?.error || "Failed to create order in database");
        }

        const supabaseOrderId = res.orderId;
        createdOrderId = supabaseOrderId; // track for catch cleanup

        // 2. Fetch Razorpay Order from server api
        const orderRes = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: grandTotal,
            idempotencyKey: supabaseOrderId
          })
        });

        if (!orderRes.ok) {
          const errData = await orderRes.json();
          throw new Error(errData.error || "Failed to initialize Razorpay order");
        }

        const razorpayOrder = await orderRes.json();

        // Razorpay Integration
        const options = {
          key: env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: razorpayOrder.amount, // from Razorpay Order object
          currency: razorpayOrder.currency || "INR",
          name: "UC Enterprises",
          description: "Purchase Payment",
          image: "/logo.png",
          order_id: razorpayOrder.id,
          handler: async function (response: any) {
            // Payment success callback
            try {
              const confirmRes = await fetch("/api/orders/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: supabaseOrderId,
                  paymentStatus: "Paid",
                  paymentMethod: "ONLINE",
                  razorpayOrderId: response.razorpay_order_id || razorpayOrder.id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature
                })
              });

              if (confirmRes.ok) {
                toast.success("Payment successful! Order placed.");
                clearCart();
                router.push(`/checkout/success?orderId=${supabaseOrderId}&total=${grandTotal}&date=${encodeURIComponent(deliveryEstimate?.date || "")}`);
              } else {
                // Payment went through but DB sync failed — don't delete the order, just alert support
                toast.error("Payment received but order registration failed. Please contact support.");
                router.push(`/checkout/failed?error=${encodeURIComponent("Payment registered, but order database state sync failed. Please contact support.")}`);
              }
            } catch (err: any) {
              // Verification threw — clean up the unpaid order
              try { await deleteFailedOrder(supabaseOrderId); } catch (_) {}
              toast.error("An unexpected error occurred during order verification.");
              router.push(`/checkout/failed?error=${encodeURIComponent(err.message || "An unexpected error occurred during payment verification.")}`);
            }
          },
          prefill: {
            name: form.fullName,
            email: form.email,
            contact: form.phone,
          },
          notes: {
            orderId: supabaseOrderId
          },
          theme: {
            color: "#f97316",
          },
        };

        const rzp = new (window as any).Razorpay(options);

        // Handle Razorpay payment failure — clean up the unpaid order immediately
        rzp.on("payment.failed", async function (response: any) {
          try {
            await deleteFailedOrder(supabaseOrderId);
          } catch (e) {
            console.error("Cleanup failed order error:", e);
          }
          setSubmitting(false);
          setIsPlacingOrder(false);
          router.push(
            `/checkout/failed?error=${encodeURIComponent(
              response.error?.description || "Razorpay payment processing failed"
            )}`
          );
        });

        // Handle modal dismiss (user closes the popup without paying)
        rzp.on("modal.ondismiss", async function () {
          try {
            await deleteFailedOrder(supabaseOrderId);
          } catch (e) {
            console.error("Cleanup dismissed order error:", e);
          }
          setSubmitting(false);
          setIsPlacingOrder(false);
          router.push(
            `/checkout/failed?error=${encodeURIComponent(
              "Payment was cancelled. Your order has not been placed."
            )}`
          );
        });

        rzp.open();
      } else {
        // COD logic
        const res = await createOrder({
          ...form,
          items,
          total: grandTotal,
          paymentMethod: "COD",
          deliveryEstimate: deliveryEstimate?.date
        });

        if (res?.success) {
          toast.success("Order placed successfully! (COD)");
          clearCart();
          router.push(`/checkout/success?orderId=${res.orderId}&total=${grandTotal}&date=${encodeURIComponent(deliveryEstimate?.date || "")}`);
        } else {
          toast.error(res?.error || "Failed to place order");
          router.push(`/checkout/failed?error=${encodeURIComponent(res?.error || "Failed to place order")}`);
        }
      }
    } catch (error: any) {
      // Clean up any Unpaid order that was created before the failure
      if (createdOrderId) {
        try { await deleteFailedOrder(createdOrderId); } catch (_) {}
      }
      toast.error(error.message || "Failed to place order");
      router.push(`/checkout/failed?error=${encodeURIComponent(error.message || "Failed to place order")}`);
    } finally {
      setSubmitting(false);
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-bold text-zinc-400 animate-pulse">
        PREPARING CHECKOUT...
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 pb-20">
      <div className="container mx-auto px-4 py-10">
        {/* Back Button */}
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-primary mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to cart
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left Side */}
          <div className="space-y-8">
            {/* Contact Information */}
            <section className="bg-white border border-orange-100 p-8 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>

                <h2 className="text-xl font-black tracking-tight">
                  Contact Information
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Full Name *
                  </label>

                  <Input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fullName:
                          e.target.value,
                      })
                    }
                    placeholder="Enter your name"
                    className="h-12 border-orange-100 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Phone Number *
                  </label>

                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone:
                          e.target.value,
                      })
                    }
                    placeholder="10-digit mobile number"
                    className="h-12 border-orange-100 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Email Address
                  </label>

                  <Input
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email:
                          e.target.value,
                      })
                    }
                    placeholder="email@example.com"
                    className="h-12 border-orange-100 rounded-xl"
                  />
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="bg-white border border-orange-100 p-8 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>

                  <h2 className="text-xl font-black tracking-tight">
                    Shipping Address
                  </h2>
                </div>

                <Link href="/account/address-book?returnTo=/checkout">
                  <button className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-zinc-100 hover:border-primary text-[10px] font-black uppercase tracking-widest transition">
                    Change Address / Manage
                  </button>
                </Link>
              </div>

              {addresses.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 mb-8">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() =>
                        handleSelectAddress(
                          addr
                        )
                      }
                      className={cn(
                        "p-4 border-2 rounded-2xl cursor-pointer transition-all relative",
                        selectedAddressId ===
                          addr.id
                          ? "border-primary bg-orange-50"
                          : "border-zinc-100 hover:border-orange-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {addr.type}
                        </span>

                        {selectedAddressId ===
                          addr.id && (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          )}
                      </div>

                      <p className="text-xs font-black mb-1">
                        {addr.full_name}
                      </p>

                      <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
                        {addr.address_line1}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-8 p-10 border-2 border-dashed border-orange-100 rounded-[2rem] text-center">
                  <MapPin className="h-10 w-10 text-orange-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                    No saved addresses found
                  </p>
                  <p className="text-xs text-zinc-400 mb-5">
                    Add a delivery address to continue placing your order.
                  </p>

                  <Link href="/account/address-book?returnTo=/checkout">
                    <button className="rounded-xl h-12 px-8 bg-primary hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs transition inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Add Delivery Address
                    </button>
                  </Link>
                </div>
              )}
            </section>

            {/* Payment Method */}
            <section className="bg-white border border-orange-100 p-8 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>

                <h2 className="text-xl font-black tracking-tight">
                  Payment Method
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  onClick={() =>
                    setPaymentMethod(
                      "ONLINE"
                    )
                  }
                  className={cn(
                    "p-5 border-2 rounded-2xl cursor-pointer transition-all",
                    paymentMethod ===
                      "ONLINE"
                      ? "border-primary bg-orange-50"
                      : "border-zinc-100"
                  )}
                >
                  <p className="font-black text-sm">
                    Online Payment
                  </p>
                </div>

                <div
                  onClick={() =>
                    setPaymentMethod("COD")
                  }
                  className={cn(
                    "p-5 border-2 rounded-2xl cursor-pointer transition-all",
                    paymentMethod === "COD"
                      ? "border-primary bg-orange-50"
                      : "border-zinc-100"
                  )}
                >
                  <p className="font-black text-sm">
                    Cash on Delivery
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl sticky top-10">
              <h2 className="text-xl font-black tracking-tight mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4"
                  >
                    <div className="relative w-20 h-20 bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden">
                      <Image
                        src={
                          item.image_url ||
                          "/images/prod_main.png"
                        }
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>

                    <div className="flex-1">
                      <p className="text-[10px] font-black truncate">
                        {item.name}
                      </p>

                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {item.quantity} x{" "}
                        {formatCurrency(
                          item.price
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 space-y-3">
                <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Subtotal</span>

                  <span>
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <span>GST Total</span>

                  <span>
                    {formatCurrency(taxTotal)}
                  </span>
                </div>

                {deliveryEstimate && (
                  <div className="flex justify-between text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <span className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5" />
                      Delivery
                    </span>
                    <span>{deliveryEstimate.date}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-black pt-2 border-t border-white/10">
                  <span>Total</span>

                  <span className="text-primary">
                    {formatCurrency(
                      grandTotal
                    )}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={
                  submitting ||
                  isPlacingOrder
                }
                className="w-full mt-8 h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest hover:bg-white hover:text-zinc-950 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ||
                  isPlacingOrder
                  ? "Processing..."
                  : paymentMethod ===
                    "ONLINE"
                    ? "Next to Payment"
                    : "Place Order (COD)"}
              </button>

              <div className="mt-4 text-center">
                 <Link href="/cart" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors">
                   Return to Cart
                 </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}