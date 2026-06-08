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
  Lock,
  Check,
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  const [deliveryCharge, setDeliveryCharge] = useState<number>(50);

  const taxTotal = items.reduce((sum, item) => sum + (item.price * item.quantity * (item.tax_rate || 0) / 100), 0);

  const grandTotal = subtotal + taxTotal + deliveryCharge;

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
            setDeliveryCharge(pinData.delivery_zones?.base_charge || 50);
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
            setDeliveryCharge(matchedZone?.base_charge || 50);
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

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!form.fullName || !form.phone || !form.address || !form.city || !form.postalCode) {
        toast.error("Please fill all required shipping fields");
        return;
      }
      if (!selectedAddressId) {
        toast.error("Please select a shipping address");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

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
              try { await deleteFailedOrder(supabaseOrderId); } catch (_) { }
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
            color: "#09090b",
          },
          modal: {
            ondismiss: async function () {
              try {
                await deleteFailedOrder(supabaseOrderId);
              } catch (e) {
                console.error("Cleanup dismissed order error:", e);
              }
              setSubmitting(false);
              setIsPlacingOrder(false);
              toast.error("Payment cancelled. You can try again.");
            }
          }
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
        try { await deleteFailedOrder(createdOrderId); } catch (_) { }
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
    <div className="bg-[linear-gradient(180deg,#fcfcfd_0%,#ffffff_100%)] min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-zinc-950 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Cart
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950">
            Secure Checkout
          </h1>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left Side */}
          <div className="space-y-8">
            {/* Stepper UI */}
            <div className="mb-8">
              <div className="flex items-center justify-between relative px-2 z-10">
                <div className="absolute left-[28px] right-[28px] top-5 -translate-y-1/2 h-1.5 bg-zinc-100 rounded-full -z-10">
                  <div className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out" style={{ width: `${((currentStep - 1) / 2) * 100}%` }}></div>
                </div>

                {[
                  { step: 1, label: "Shipping" },
                  { step: 2, label: "Payment" },
                  { step: 3, label: "Review" }
                ].map((item) => {
                  const isCompleted = currentStep > item.step;
                  const isActive = currentStep === item.step;
                  const isPending = currentStep < item.step;

                  return (
                    <div key={item.step} className="flex flex-col items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-white shadow-sm",
                        isCompleted ? "bg-primary text-white" : isActive ? "bg-zinc-950 text-white scale-110" : "bg-zinc-100 text-zinc-400"
                      )}>
                        {isCompleted ? <Check className="w-5 h-5" /> : item.step}
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wider bg-white px-2",
                        isActive ? "text-zinc-950" : isCompleted ? "text-primary" : "text-zinc-400"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {currentStep === 1 && (
              <>
                {/* Contact Information */}
                <section className="bg-white border border-zinc-200 p-6 sm:p-8 shadow-sm rounded-3xl">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900">
                      <User className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-zinc-950">
                      Contact Information
                    </h2>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-600 ml-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="Enter your name"
                        className="h-12 border-zinc-200 rounded-xl focus-visible:ring-zinc-950"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-600 ml-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                        className="h-12 border-zinc-200 rounded-xl focus-visible:ring-zinc-950"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-zinc-600 ml-1">
                        Email Address
                      </label>
                      <Input
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="email@example.com"
                        className="h-12 border-zinc-200 rounded-xl focus-visible:ring-zinc-950"
                      />
                    </div>
                  </div>
                </section>

                {/* Address */}
                <section className="bg-white border border-zinc-200 p-6 sm:p-8 shadow-sm rounded-3xl">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-zinc-950">
                        Shipping Address
                      </h2>
                    </div>

                    <Link href="/account/address-book?returnTo=/checkout">
                      <button className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition">
                        Change / Manage
                      </button>
                    </Link>
                  </div>

                  {addresses.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectAddress(addr)}
                          className={cn(
                            "p-5 border rounded-2xl cursor-pointer transition-all relative overflow-hidden",
                            selectedAddressId === addr.id
                              ? "border-zinc-950 bg-zinc-50 shadow-sm ring-1 ring-zinc-950"
                              : "border-zinc-200 hover:border-zinc-400 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 bg-white px-2 py-1 rounded border border-zinc-100 shadow-sm">
                              {addr.type}
                            </span>
                            {selectedAddressId === addr.id && (
                              <CheckCircle2 className="w-5 h-5 text-zinc-950" />
                            )}
                          </div>
                          <p className="text-sm font-black text-zinc-950 mb-1">
                            {addr.full_name}
                          </p>
                          <p className="text-xs font-medium text-zinc-500 leading-relaxed line-clamp-2">
                            {addr.address_line1} {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 border-2 border-dashed border-zinc-200 rounded-3xl text-center">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="h-8 w-8 text-zinc-300" />
                      </div>
                      <p className="text-sm font-bold text-zinc-950 mb-2">
                        No saved addresses found
                      </p>
                      <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                        Add a delivery address to continue placing your order.
                      </p>

                      <Link href="/account/address-book?returnTo=/checkout">
                        <button className="rounded-xl h-12 px-8 bg-zinc-950 hover:bg-primary text-white font-bold text-sm transition inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" /> Add Delivery Address
                        </button>
                      </Link>
                    </div>
                  )}
                </section>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end pt-4 gap-3">
                  <button onClick={handleNextStep} className="rounded-xl h-14 w-full sm:w-auto px-8 bg-zinc-950 hover:bg-primary text-white font-bold text-sm transition inline-flex items-center justify-center gap-2">
                    Continue to Payment
                  </button>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                {/* Payment Method */}
                <section className="bg-white border border-zinc-200 p-6 sm:p-8 shadow-sm rounded-3xl">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-zinc-950">
                      Payment Method
                    </h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div
                      onClick={() => setPaymentMethod("ONLINE")}
                      className={cn(
                        "p-5 border rounded-2xl cursor-pointer transition-all flex items-center justify-between",
                        paymentMethod === "ONLINE"
                          ? "border-zinc-950 bg-zinc-50 shadow-sm ring-1 ring-zinc-950"
                          : "border-zinc-200 hover:border-zinc-400"
                      )}
                    >
                      <p className="font-bold text-sm text-zinc-950">Online Payment</p>
                      {paymentMethod === "ONLINE" && <CheckCircle2 className="w-5 h-5 text-zinc-950" />}
                    </div>

                    <div
                      onClick={() => setPaymentMethod("COD")}
                      className={cn(
                        "p-5 border rounded-2xl cursor-pointer transition-all flex items-center justify-between",
                        paymentMethod === "COD"
                          ? "border-zinc-950 bg-zinc-50 shadow-sm ring-1 ring-zinc-950"
                          : "border-zinc-200 hover:border-zinc-400"
                      )}
                    >
                      <p className="font-bold text-sm text-zinc-950">Cash on Delivery</p>
                      {paymentMethod === "COD" && <CheckCircle2 className="w-5 h-5 text-zinc-950" />}
                    </div>
                  </div>
                </section>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between pt-4 gap-3">
                  <button onClick={handlePrevStep} className="rounded-xl h-14 w-full sm:w-auto px-8 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-950 font-bold text-sm transition inline-flex items-center justify-center gap-2">
                    Back to Shipping
                  </button>
                  <button onClick={handleNextStep} className="rounded-xl h-14 w-full sm:w-auto px-8 bg-zinc-950 hover:bg-primary text-white font-bold text-sm transition inline-flex items-center justify-center gap-2">
                    Continue to Review
                  </button>
                </div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <section className="bg-white border border-zinc-200 p-6 sm:p-8 shadow-sm rounded-3xl">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-zinc-950">
                      Review Your Order
                    </h2>
                  </div>

                  <div className="grid gap-6">
                    <div className="p-5 border border-zinc-200 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Shipping To</h3>
                        <button onClick={() => setCurrentStep(1)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                      </div>
                      <p className="font-bold text-sm text-zinc-950">{form.fullName}</p>
                      <p className="text-sm text-zinc-600">{form.address}, {form.city}, {form.state} {form.postalCode}</p>
                      <p className="text-sm text-zinc-600">{form.phone}</p>
                    </div>

                    <div className="p-5 border border-zinc-200 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Payment Method</h3>
                        <button onClick={() => setCurrentStep(2)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                      </div>
                      <p className="font-bold text-sm text-zinc-950">{paymentMethod === "ONLINE" ? "Online Payment (Razorpay)" : "Cash on Delivery"}</p>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between pt-4 gap-3">
                  <button onClick={handlePrevStep} className="rounded-xl h-14 w-full sm:w-auto px-8 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-950 font-bold text-sm transition inline-flex items-center justify-center gap-2">
                    Back to Payment
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting || isPlacingOrder}
                    className="rounded-xl h-14 w-full sm:w-auto px-8 bg-zinc-950 hover:bg-primary hover:shadow-lg hover:shadow-primary/20 text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitting || isPlacingOrder
                      ? "Processing..."
                      : paymentMethod === "ONLINE"
                      ? "Proceed to Payment"
                      : "Place Order (COD)"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            <div className="bg-white shadow-sm border border-zinc-200 rounded-3xl overflow-hidden sticky top-24">
              <div className="p-6 sm:p-8 bg-zinc-50/50 border-b border-zinc-100">
                <h2 className="text-xl font-black text-zinc-950">Order Summary</h2>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                {/* Items List */}
                <div className="space-y-4 pb-6 border-b border-zinc-100 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {items.map((item) => (
                    <div key={`summary-${item.id}`} className="flex gap-4 group">
                      <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden">
                        <Image
                          src={item.image_url || "/images/prod_main.png"}
                          alt={item.name}
                          fill
                          className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                        <p className="text-xs sm:text-sm font-bold text-zinc-950 truncate">
                          {item.name}
                        </p>
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-500">
                          <span>{item.quantity} × {formatCurrency(item.price)}</span>
                          <span className="text-zinc-950">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-2 pb-6 border-b border-zinc-100">
                  <div className="flex justify-between text-sm font-medium text-zinc-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-zinc-950">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-medium text-zinc-600">
                    <span>Estimated Shipping</span>
                    <span className="font-bold text-zinc-950">{formatCurrency(deliveryCharge)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-medium text-zinc-600">
                    <span>Estimated Tax</span>
                    <span className="font-bold text-zinc-950">{formatCurrency(taxTotal)}</span>
                  </div>

                  {deliveryEstimate && (
                    <div className="flex justify-between text-sm font-black text-emerald-700 bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-100/60 mt-4">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Estimated Delivery
                      </span>
                      <span>{deliveryEstimate.date}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-lg pt-2">
                  <span className="font-black text-zinc-950">Total</span>
                  <span className="font-black text-primary text-xl">{formatCurrency(grandTotal)}</span>
                </div>

                <div className="pt-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 pt-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secure Encrypted Checkout</span>
                  </div>

                  {/* Trust Badges */}
                  <div className="flex justify-center gap-3 pt-4 border-t border-zinc-100 mt-2">
                    <div className="w-12 h-7 bg-white rounded-md flex items-center justify-center border border-zinc-200 shadow-sm" title="Visa">
                      <span className="text-[10px] font-black italic text-[#1434CB]">VISA</span>
                    </div>
                    <div className="w-12 h-7 bg-white rounded-md flex items-center justify-center border border-zinc-200 shadow-sm" title="Mastercard">
                      <span className="text-[10px] font-black italic text-[#EB001B]">MASTER</span>
                    </div>
                    <div className="w-12 h-7 bg-white rounded-md flex items-center justify-center border border-zinc-200 shadow-sm" title="UPI">
                      <span className="text-[10px] font-black tracking-wide text-zinc-800">UPI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
