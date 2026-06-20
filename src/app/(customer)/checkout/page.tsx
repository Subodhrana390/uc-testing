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
  AlertCircle,
  ShieldCheck,
  Loader2,
  ChevronDown,
  ShoppingBag,
} from "lucide-react";

import { Input } from "@/components/ui/input";

import { type CartItem } from "@/store/useCartStore";
import { useCartStore } from "@/store/useCartStore";
import RecommendedProducts from "@/components/storefront/RecommendedProducts";

import { formatCurrency, getExclusivePrice } from "@/lib/format";
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
  igst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  is_tax_inclusive?: boolean;
  stock_quantity?: number;
}

import { useAuthStore } from "@/store/useAuthStore";
import { useSiteSettings } from "@/hooks/api/useSiteSettings";

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  const { data: siteSettings } = useSiteSettings();
  const emiEnabledSetting = siteSettings?.emi_enabled ?? true;
  const couponsEnabledSetting = siteSettings?.coupons_enabled ?? true;

  const [items, setItems] = useState<CartItemWithTax[]>([]);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [mobileOrderSummaryOpen, setMobileOrderSummaryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationData, setVerificationData] = useState<{ orderId: string; total: number } | null>(null);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] =
    useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<
    "COD" | "ONLINE" | "EMI"
  >("ONLINE");

  const [emiProviders, setEmiProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [fetchingEmi, setFetchingEmi] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const originState = "Punjab";
  const destState = form.state || "";
  const isIntraState = originState.toLowerCase() === destState.toLowerCase();

  const totals = items.reduce(
    (acc, item) => {
      const igstRate = item.igst_rate || 0;
      const cgstRate = item.cgst_rate || 0;
      const sgstRate = item.sgst_rate || 0;

      let appliedCgstRate = 0;
      let appliedSgstRate = 0;
      let appliedIgstRate = 0;

      if (isIntraState) {
        appliedCgstRate = cgstRate > 0 ? cgstRate : (igstRate > 0 ? igstRate / 2 : 0);
        appliedSgstRate = sgstRate > 0 ? sgstRate : (igstRate > 0 ? igstRate / 2 : 0);
      } else {
        appliedIgstRate = igstRate > 0 ? igstRate : (cgstRate + sgstRate);
      }

      const rate = isIntraState ? (appliedCgstRate + appliedSgstRate) : appliedIgstRate;
      const isTaxInclusive = item.is_tax_inclusive || false;
      const itemTotal = item.price * item.quantity;

      let itemTax = 0;
      let itemBase = itemTotal;

      if (rate > 0) {
        if (isTaxInclusive) {
          itemBase = itemTotal / (1 + rate / 100);
          itemTax = itemTotal - itemBase;
        } else {
          itemTax = itemTotal * (rate / 100);
        }

        if (isIntraState) {
          const totalCgstSgst = appliedCgstRate + appliedSgstRate;
          if (totalCgstSgst > 0) {
            acc.cgstAmt += itemTax * (appliedCgstRate / totalCgstSgst);
            acc.sgstAmt += itemTax * (appliedSgstRate / totalCgstSgst);
            acc.orderCgstRate = appliedCgstRate;
            acc.orderSgstRate = appliedSgstRate;
          }
        } else {
          acc.igstAmt += itemTax;
          acc.orderIgstRate = appliedIgstRate;
        }
      }

      acc.subtotalExclGst += itemBase;
      acc.subtotal += itemTotal; // For backward compatibility with existing coupons logic
      return acc;
    },
    { subtotalExclGst: 0, subtotal: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, orderCgstRate: 0, orderSgstRate: 0, orderIgstRate: 0 }
  );

  const subtotal = items.length > 0 ? totals.subtotal : getCartTotal();
  const [deliveryCharge, setDeliveryCharge] = useState<number>(50);
  const shippingGst = deliveryCharge * 0.18;

  const expectedTotal = totals.subtotalExclGst + totals.cgstAmt + totals.sgstAmt + totals.igstAmt + deliveryCharge + shippingGst - discountAmount;
  const grandTotal = Math.max(0, expectedTotal);

  const actualTax = totals.cgstAmt + totals.sgstAmt + totals.igstAmt;

  useEffect(() => {
    if (appliedCoupon) {
      let discount = 0;
      if (appliedCoupon.discountType === "percentage") {
        discount = subtotal * (appliedCoupon.discountValue / 100);
        if (appliedCoupon.maxDiscountAmount !== null) {
          discount = Math.min(discount, appliedCoupon.maxDiscountAmount);
        }
      } else if (appliedCoupon.discountType === "fixed") {
        discount = appliedCoupon.discountValue;
      }
      discount = Math.min(discount, subtotal);
      setDiscountAmount(discount);
    } else {
      setDiscountAmount(0);
    }
  }, [subtotal, appliedCoupon]);

  useEffect(() => {
    if (paymentMethod === "EMI") {
      setFetchingEmi(true);
      import("@/app/actions/emi").then(({ getEligibleEMIOptions }) => {
        getEligibleEMIOptions(grandTotal).then((res) => {
          if (res.success && res.providers) {
            setEmiProviders(res.providers);
            if (res.providers.length > 0) {
              setSelectedProviderId(res.providers[0].id);
              if (res.providers[0].plans.length > 0) {
                setSelectedPlanId(res.providers[0].plans[0].id);
              }
            } else {
              setSelectedProviderId(null);
              setSelectedPlanId(null);
            }
          }
          setFetchingEmi(false);
        });
      });
    } else {
      setEmiProviders([]);
      setSelectedProviderId(null);
      setSelectedPlanId(null);
    }
  }, [paymentMethod, grandTotal]);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const { validateCouponAction } = await import("@/app/actions/coupons");
      const res = await validateCouponAction(couponCodeInput, subtotal);
      if (res.success && res.coupon) {
        setAppliedCoupon({
          code: res.coupon.code,
          discountType: res.coupon.discount_type as "percentage" | "fixed",
          discountValue: res.coupon.discount_value,
          minOrderAmount: res.coupon.min_order_amount,
          maxDiscountAmount: res.coupon.max_discount_amount,
        });
        toast.success(`Coupon "${res.coupon.code}" applied successfully!`);
      } else {
        setCouponError(res.error || "Failed to apply coupon");
        toast.error(res.error || "Failed to apply coupon");
      }
    } catch (err: any) {
      setCouponError(err.message || "An unexpected error occurred");
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponError(null);
    toast.success("Coupon removed");
  };

  useEffect(() => {
    if (!isAuthInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const buyNowActive = params.get("buyNow") === "true";
    setIsBuyNow(buyNowActive);

    let checkoutItems: CartItem[] = [];
    if (buyNowActive) {
      const buyNowStr = sessionStorage.getItem("buy_now_item");
      if (buyNowStr) {
        try {
          checkoutItems = [JSON.parse(buyNowStr)];
        } catch (e) {
          console.error("Failed to parse buy_now_item:", e);
        }
      }
    } else {
      checkoutItems = useCartStore.getState().items;
    }

    if (checkoutItems.length === 0) {
      router.push("/cart");
      return;
    }

    async function fetchData() {
      loadRazorpayScript();

      const variantIds = checkoutItems.map((i) => i.variant_id || (i.variant_attributes ? i.id : null)).filter(Boolean);
      const { data: variants } = variantIds.length > 0
        ? await supabase.from("product_variants").select("id, product_id, price, sale_price, stock_quantity").in("id", variantIds)
        : { data: [] };

      const missingProductIds = variants?.map(v => v.product_id) || [];
      const allProductIds = Array.from(new Set([...checkoutItems.map((i) => i.product_id || i.id), ...missingProductIds]));

      const { data: products } = await supabase
        .from("products")
        .select("id, price, sale_price, igst_rate, cgst_rate, sgst_rate, is_tax_inclusive, stock_quantity")
        .in("id", allProductIds);

      const itemsWithTax = checkoutItems.map((item) => {
        const variant = variants?.find((v: any) => v.id === item.variant_id || (item.variant_attributes && v.id === item.id));
        const resolvedProductId = item.product_id || variant?.product_id || item.id;
        
        const prod = products?.find(
          (p: any) => p.id === resolvedProductId
        );

        let currentPrice = prod ? (Number(prod.sale_price || prod.price) || 0) : item.price;
        let stock_quantity = prod?.stock_quantity || 0;

        if (variant) {
          currentPrice = Number(variant.sale_price || variant.price) || 0;
          stock_quantity = variant.stock_quantity || 0;
        } else if (item.variant_id || item.variant_attributes) {
          stock_quantity = 0; // If variant is missing, treat as out of stock
        }

        return {
          ...item,
          price: currentPrice,
          igst_rate: prod?.igst_rate || 0,
          cgst_rate: prod?.cgst_rate || 0,
          sgst_rate: prod?.sgst_rate || 0,
          is_tax_inclusive: prod?.is_tax_inclusive || false,
          stock_quantity,
        };
      });

      const availableItems = itemsWithTax.filter(item => item.stock_quantity > 0);
      const outOfStockItems = itemsWithTax.filter(item => item.stock_quantity === 0);

      if (outOfStockItems.length > 0) {
        if (user) {
          const wishlistInserts = outOfStockItems.map(item => ({
            user_id: user.id,
            product_id: item.id
          }));

          const { error } = await supabase.from('wishlist').upsert(wishlistInserts, { onConflict: 'user_id,product_id' });

          if (!error) {
            if (!buyNowActive) {
              outOfStockItems.forEach(item => useCartStore.getState().removeItem(item.id));
            }
            toast.error(`${outOfStockItems.length} out-of-stock item(s) were automatically moved to your wishlist.`, { duration: 5000 });
          }
        } else {
          if (!buyNowActive) {
            outOfStockItems.forEach(item => useCartStore.getState().removeItem(item.id));
          }
          toast.error(`${outOfStockItems.length} out-of-stock item(s) were removed from checkout.`, { duration: 5000 });
        }
      }

      setItems(availableItems);

      if (availableItems.length === 0) {
        router.push("/cart");
        return;
      }

      if (user) {
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
            fullName: defaultAddr.full_name || prev.fullName,
            phone: defaultAddr.phone || prev.phone,
            address: `${defaultAddr.address_line1}${defaultAddr.address_line2
              ? ", " +
              defaultAddr.address_line2
              : ""
              }`,
            city: defaultAddr.city || "",
            state: defaultAddr.state || "",
            postalCode: defaultAddr.postal_code || "",
            country: defaultAddr.country || "India",
          }));
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [router, supabase, isAuthInitialized, user]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);

    setForm((prev) => ({
      ...prev,
      fullName: addr.full_name || prev.fullName,
      phone: addr.phone || prev.phone,
      address: `${addr.address_line1}${addr.address_line2
        ? ", " + addr.address_line2
        : ""
        }`,
      city: addr.city || "",
      state: addr.state || "",
      postalCode: addr.postal_code || "",
      country: addr.country || "India",
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
      if (!form.fullName || !form.phone || !form.email || !form.address || !form.city || !form.state || !form.postalCode) {
        toast.error("Please fill all required fields (Name, Phone, Email, Address, City, State, PIN Code)");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    let createdOrderId: string | null = null;

    try {
      const shippingAddressString = form.address;

      const { createOrder } = await import("@/app/actions/orders");

      if (paymentMethod === "ONLINE" || paymentMethod === "EMI") {
        if (paymentMethod === "EMI" && (!selectedProviderId || !selectedPlanId)) {
          throw new Error("Please select an EMI provider and plan");
        }

        // Ensure Razorpay script is loaded
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error("Failed to load Razorpay SDK. Please check your internet connection or disable ad-blockers.");
        }

        const selectedProvider = emiProviders.find(p => p.id === selectedProviderId);
        const selectedPlan = selectedProvider?.plans.find((pl: any) => pl.id === selectedPlanId);

        // 1. Create order in Supabase as Unpaid
        const res = await createOrder({
          ...form,
          address: shippingAddressString,
          items,
          total: grandTotal,
          taxAmount: actualTax,
          shippingAmount: deliveryCharge,
          paymentMethod: "ONLINE",
          deliveryEstimate: deliveryEstimate?.date,
          paymentStatus: "Unpaid",
          couponCode: appliedCoupon?.code || undefined,
          isEmi: paymentMethod === "EMI",
          emiProviderId: paymentMethod === "EMI" ? selectedProviderId || undefined : undefined,
          emiPlanId: paymentMethod === "EMI" ? selectedPlanId || undefined : undefined,
          emiTenure: paymentMethod === "EMI" ? selectedPlan?.tenureMonths : undefined,
          emiMonthlyInstallment: paymentMethod === "EMI" ? selectedPlan?.emi : undefined,
          emiInterestRate: paymentMethod === "EMI" ? selectedPlan?.interestRate : undefined,
          emiTotalPayable: paymentMethod === "EMI" ? selectedPlan?.totalPayable : undefined,
          emiDetails: paymentMethod === "EMI" ? {
            provider_name: selectedProvider?.name,
            provider_code: selectedProvider?.code,
            tenure_months: selectedPlan?.tenureMonths,
            interest_rate: selectedPlan?.interestRate
          } : undefined
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
            // Payment success callback - show verifying screen
            try {
              setVerifyingPayment(true);
              setVerificationData({ orderId: supabaseOrderId, total: grandTotal });

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
                toast.success("Payment verified successfully! Order placed.");
                if (isBuyNow) {
                  sessionStorage.removeItem("buy_now_item");
                } else {
                  clearCart();
                }
                // Add small delay to let user see the success state
                setTimeout(() => {
                  router.push(`/checkout/success?orderId=${supabaseOrderId}&total=${grandTotal}&date=${encodeURIComponent(deliveryEstimate?.date || "")}`);
                }, 800);
              } else {
                // Payment went through but DB sync failed — don't delete the order, just alert support
                setVerifyingPayment(false);
                setVerificationData(null);
                toast.error("Payment received but order registration failed. Please contact support.");
                router.push(`/checkout/failed?error=${encodeURIComponent("Payment registered, but order database state sync failed. Please contact support.")}`);
              }
            } catch (err: any) {
              // Verification threw — clean up the unpaid order
              setVerifyingPayment(false);
              setVerificationData(null);
              try { await deleteFailedOrder(supabaseOrderId, 'FAILED'); } catch (_) { }
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
                await deleteFailedOrder(supabaseOrderId, 'CANCELLED');
              } catch (e) {
                console.error("Cleanup dismissed order error:", e);
              }
              setSubmitting(false);
              setIsPlacingOrder(false);
              toast.error("Payment cancelled. You can try again.");
              router.push(
                `/checkout/failed?error=${encodeURIComponent(
                  "Payment window closed without completing payment. Please try again."
                )}`
              );
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);

        // Handle Razorpay payment failure — clean up the unpaid order immediately
        rzp.on("payment.failed", async function (response: any) {
          try {
            await deleteFailedOrder(supabaseOrderId, 'FAILED');
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
          address: shippingAddressString,
          items,
          total: grandTotal,
          taxAmount: actualTax,
          shippingAmount: deliveryCharge,
          paymentMethod: "COD",
          deliveryEstimate: deliveryEstimate?.date,
          couponCode: appliedCoupon?.code || undefined
        });

        if (res?.success) {
          toast.success("Order placed successfully! (COD)");
          if (isBuyNow) {
            sessionStorage.removeItem("buy_now_item");
          } else {
            clearCart();
          }
          router.push(`/checkout/success?orderId=${res.orderId}&total=${grandTotal}&date=${encodeURIComponent(deliveryEstimate?.date || "")}`);
        } else {
          toast.error(res?.error || "Failed to place order");
          router.push(`/checkout/failed?error=${encodeURIComponent(res?.error || "Failed to place order")}`);
        }
      }
    } catch (error: any) {
      // Clean up any Unpaid order that was created before the failure
      if (createdOrderId) {
        try { await deleteFailedOrder(createdOrderId, 'FAILED'); } catch (_) { }
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

  // Verifying Payment Screen
  if (verifyingPayment && verificationData) {
    return (
      <div className="flex flex-col items-center pt-12 sm:pt-20 p-6 antialiased">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">

          {/* Main Card */}
          <div className="rounded-3xl p-8 text-center space-y-8">

            {/* Animated Verification Icon Container */}
            <div className="flex justify-center pt-2">
              <div className="relative w-28 h-28 flex items-center justify-center">

                {/* Outer soft pulsing background glow */}
                <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping opacity-75" style={{ animationDuration: '3s' }} />

                {/* Spinning background layer using gradients instead of borders */}
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-primary/10 to-primary animate-spin"
                  style={{ animationDuration: '1.5s' }}
                />

                {/* Solid inner core mask that creates a clean gap without using lines */}
                <div className="absolute inset-1.5 bg-zinc-50 rounded-full" />

                {/* Floating Center Icon Wrapper */}
                <div className="absolute inset-3 bg-white rounded-full shadow-lg shadow-zinc-200 flex items-center justify-center">
                  <CreditCard className="w-9 h-9 text-primary animate-pulse" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Verifying Payment</h2>
              <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                Please hold tight while we securely process your transaction...
              </p>
            </div>

            {/* Order Details Panel - Uses a solid light background for separation */}
            <div className="bg-zinc-50 rounded-2xl p-5 text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Order ID</span>
                <span className="text-sm font-semibold text-zinc-700 font-mono bg-zinc-200/60 px-3 py-1 rounded-lg">
                  {getDisplayOrderId(verificationData.orderId, new Date().toISOString())}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Amount Paid</span>
                <span className="text-xl font-extrabold text-zinc-900 tracking-tight">
                {verificationData.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              </div>
            </div>

            {/* Status Message - Uses color contrast to stand out safely */}
            <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-4 text-left">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-900">Don't refresh or close this tab</p>
                <p className="text-xs text-amber-700/90 leading-relaxed">To prevent double charges, leave this window open until confirmation completes.</p>
              </div>
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="flex items-center justify-center gap-1.5 mt-6 text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold tracking-wide uppercase">Secured End-to-End Encryption</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[linear-gradient(180deg,#fcfcfd_0%,#ffffff_100%)] min-h-[calc(100vh-80px)] pb-28 lg:pb-20">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-zinc-400 hover:text-zinc-950 transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Cart</span>
            <span className="sm:hidden">Cart</span>
          </Link>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-zinc-950">
            Secure Checkout
          </h1>
        </div>

        <div className="grid gap-6 sm:gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left Side */}
          <div className="space-y-5 sm:space-y-8">
            {/* Stepper UI */}
            <div className="mb-4 sm:mb-8">
              <div className="flex items-center justify-between relative px-1 sm:px-2 z-10">
                <div className="absolute left-[20px] right-[20px] sm:left-[28px] sm:right-[28px] top-[16px] sm:top-5 -translate-y-1/2 h-1 sm:h-1.5 bg-zinc-100 rounded-full -z-10">
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
                    <div key={item.step} className="flex flex-col items-center gap-1.5 sm:gap-3">
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ring-2 sm:ring-4 ring-white shadow-sm",
                        isCompleted ? "bg-primary text-white" : isActive ? "bg-zinc-950 text-white scale-110" : "bg-zinc-100 text-zinc-400"
                      )}>
                        {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : item.step}
                      </div>
                      <span className={cn(
                        "text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-white px-1 sm:px-2",
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
                {/* Shipping Address */}
                <section className="bg-white border border-zinc-200 p-4 sm:p-6 md:p-8 shadow-sm rounded-2xl sm:rounded-3xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-zinc-950">
                        Shipping Address
                      </h2>
                    </div>

                    {user && (
                      <Link href="/account/address-book?returnTo=/checkout">
                        <button className="inline-flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-3 sm:px-4 rounded-lg sm:rounded-xl border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 text-[10px] sm:text-xs font-bold text-zinc-700 transition">
                          <span className="hidden sm:inline">Change / Manage</span>
                          <span className="sm:hidden">Manage</span>
                        </button>
                      </Link>
                    )}
                  </div>

                  {user && addresses.length > 0 ? (
                    <div className="pb-2">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 ml-1">
                        Select a Saved Address
                      </h3>
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
                            <p className="text-xs font-semibold text-zinc-700 leading-relaxed">
                              {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}
                            </p>
                            <p className="text-xs text-zinc-500 font-medium">
                              {addr.city}, {addr.state} — {addr.postal_code}
                            </p>
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                              {addr.country}
                            </p>
                            {addr.phone && (
                              <p className="text-xs text-zinc-500 font-semibold mt-2 border-t border-zinc-100 pt-1.5">
                                Mobile: {addr.phone}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-zinc-500 text-sm mb-4">No saved addresses found. Please add a shipping address in your address book to proceed.</p>
                      <Link href="/account/address-book?returnTo=/checkout">
                        <button className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-primary transition">
                          Add Shipping Address
                        </button>
                      </Link>
                    </div>
                  )}
                </section>

                <div className="hidden lg:flex flex-col-reverse sm:flex-row sm:justify-end pt-4 gap-3">
                  <button onClick={handleNextStep} className="rounded-xl h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 bg-zinc-950 hover:bg-primary text-white font-bold text-xs sm:text-sm transition inline-flex items-center justify-center gap-2">
                    Continue to Payment
                  </button>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                {/* Payment Method */}
                <section className="bg-white border border-zinc-200 p-4 sm:p-6 md:p-8 shadow-sm rounded-2xl sm:rounded-3xl">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-zinc-950">
                      Payment Method
                    </h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
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

                    {emiEnabledSetting && (
                      <div
                        onClick={() => setPaymentMethod("EMI")}
                        className={cn(
                          "p-5 border rounded-2xl cursor-pointer transition-all flex items-center justify-between",
                          paymentMethod === "EMI"
                            ? "border-zinc-950 bg-zinc-50 shadow-sm ring-1 ring-zinc-950"
                            : "border-zinc-200 hover:border-zinc-400"
                        )}
                      >
                        <p className="font-bold text-sm text-zinc-950">Pay in EMI</p>
                        {paymentMethod === "EMI" && <CheckCircle2 className="w-5 h-5 text-zinc-950" />}
                      </div>
                    )}
                  </div>

                  {emiEnabledSetting && paymentMethod === "EMI" && (
                    <div className="mt-6 pt-6 border-t border-zinc-100 space-y-6 animate-in fade-in duration-300">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-950 mb-1">Select EMI Provider</h3>
                        <p className="text-xs text-zinc-500">Available bank credit cards & finance partners for your order amount</p>
                      </div>

                      {fetchingEmi ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-xs font-bold text-zinc-400">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Checking eligibility & plans...</span>
                        </div>
                      ) : emiProviders.length === 0 ? (
                        <div className="p-5 border border-amber-100 bg-amber-50/50 rounded-2xl flex items-center gap-3 text-amber-700 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>No EMI plans available for this order amount. EMI requires a minimum order value of ₹3,000.</span>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Banks Grid */}
                          <div className="grid gap-3 sm:grid-cols-3">
                            {emiProviders.map((prov) => (
                              <div
                                key={prov.id}
                                onClick={() => {
                                  setSelectedProviderId(prov.id);
                                  if (prov.plans.length > 0) {
                                    setSelectedPlanId(prov.plans[0].id);
                                  }
                                }}
                                className={cn(
                                  "p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between h-20 hover:border-zinc-400",
                                  selectedProviderId === prov.id
                                    ? "border-zinc-950 bg-zinc-50/50 ring-1 ring-zinc-950"
                                    : "border-zinc-200"
                                )}
                              >
                                <span className="text-xs font-black text-zinc-900 block truncate">{prov.name}</span>
                                <span className="text-[10px] text-zinc-400 font-medium block">From ₹{prov.minOrderAmount.toLocaleString('en-IN')} spend</span>
                              </div>
                            ))}
                          </div>

                          {/* Selected Bank Plans */}
                          {selectedProviderId && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Available Tenures</h4>
                              <div className="grid gap-3 sm:grid-cols-3">
                                {emiProviders
                                  .find((p) => p.id === selectedProviderId)
                                  ?.plans.map((plan: any) => (
                                    <div
                                      key={plan.id}
                                      onClick={() => setSelectedPlanId(plan.id)}
                                      className={cn(
                                        "p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between h-28 hover:border-zinc-400 relative",
                                        selectedPlanId === plan.id
                                          ? "border-zinc-950 bg-zinc-50/30 ring-1 ring-zinc-950"
                                          : "border-zinc-200"
                                      )}
                                    >
                                      {plan.interestRate === 0 && (
                                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-black uppercase rounded">
                                          No Cost
                                        </span>
                                      )}
                                      <div>
                                        <span className="text-sm font-black text-zinc-900">{plan.tenureMonths} Months</span>
                                        <span className="text-xs text-zinc-500 block mt-1">₹{plan.emi.toLocaleString('en-IN')}/mo</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-zinc-400 block pt-1">
                                        {plan.interestRate > 0 ? `${plan.interestRate}% interest` : "Interest-free"}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* EMI Details Breakdown */}
                          {selectedProviderId && selectedPlanId && (() => {
                            const provider = emiProviders.find(p => p.id === selectedProviderId);
                            const plan = provider?.plans.find((pl: any) => pl.id === selectedPlanId);
                            if (!plan) return null;

                            return (
                              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-4">
                                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider pb-2 border-b border-zinc-200/60">
                                  <span>EMI Term Summary</span>
                                  <span className="text-primary text-[10px] font-bold">{provider?.name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-zinc-600">
                                  <div className="flex flex-col gap-1">
                                    <span>Tenure: <strong className="text-zinc-900">{plan.tenureMonths} Months</strong></span>
                                    <span>Interest Rate: <strong className="text-zinc-900">{plan.interestRate}% p.a.</strong></span>
                                  </div>
                                  <div className="flex flex-col gap-1 text-right">
                                    <span>Monthly Installment: <strong className="text-zinc-900">₹{plan.emi.toLocaleString('en-IN')}</strong></span>
                                    <span>Total Payable: <strong className="text-zinc-900">₹{plan.totalPayable.toLocaleString('en-IN')}</strong></span>
                                  </div>
                                </div>
                                {plan.interestRate > 0 && (
                                  <div className="p-3 bg-white rounded-lg border border-zinc-150 text-[10px] text-zinc-500 leading-normal font-semibold">
                                    Includes <strong>₹{plan.totalInterest.toLocaleString('en-IN')}</strong> total interest charged by the card-issuing bank.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between pt-4 gap-2 sm:gap-3">
                  <button onClick={handlePrevStep} className="rounded-xl h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-950 font-bold text-xs sm:text-sm transition inline-flex items-center justify-center gap-2">
                    Back to Shipping
                  </button>
                  <button onClick={handleNextStep} className="hidden lg:inline-flex rounded-xl h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 bg-zinc-950 hover:bg-primary text-white font-bold text-xs sm:text-sm transition items-center justify-center gap-2">
                    Continue to Review
                  </button>
                </div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <section className="bg-white border border-zinc-200 p-4 sm:p-6 md:p-8 shadow-sm rounded-2xl sm:rounded-3xl">
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
                      <p className="font-bold text-sm text-zinc-950">
                        {form.fullName}
                      </p>
                      <p className="text-xs font-semibold text-zinc-700 mt-1">{form.address}</p>
                      <p className="text-xs text-zinc-500 font-medium">{form.city}, {form.state} — {form.postalCode}</p>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">{form.country}</p>

                      <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-bold block text-zinc-400 uppercase tracking-wider text-[10px]">Recipient Phone</span>
                          <span className="font-medium text-zinc-700">
                            {form.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 border border-zinc-200 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Contact Details</h3>
                        <button onClick={() => setCurrentStep(1)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                      </div>
                      <p className="font-bold text-sm text-zinc-950">{form.fullName}</p>

                      <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-bold block text-zinc-400 uppercase tracking-wider text-[10px]">Phone</span>
                          <span className="font-medium text-zinc-700">{form.phone}</span>
                        </div>
                        {form.email && (
                          <div>
                            <span className="font-bold block text-zinc-400 uppercase tracking-wider text-[10px]">Email</span>
                            <span className="font-medium text-zinc-700 truncate block" title={form.email}>{form.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 border border-zinc-200 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Payment Method</h3>
                        <button onClick={() => setCurrentStep(2)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                      </div>
                      <p className="font-bold text-sm text-zinc-950">
                        {paymentMethod === "COD"
                          ? "Cash on Delivery"
                          : paymentMethod === "ONLINE"
                            ? "Online Payment (Razorpay)"
                            : `Pay in Installments (EMI)`}
                      </p>
                      {paymentMethod === "EMI" && selectedProviderId && selectedPlanId && (() => {
                        const provider = emiProviders.find(p => p.id === selectedProviderId);
                        const plan = provider?.plans.find((pl: any) => pl.id === selectedPlanId);
                        return (
                          <p className="text-xs text-zinc-500 mt-1 font-medium">
                            Plan: {provider?.name} ({plan?.tenureMonths} Months @ {plan?.interestRate}% p.a.) - ₹{plan?.emi}/mo (Total: ₹{plan?.totalPayable})
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </section>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between pt-4 gap-2 sm:gap-3">
                  <button onClick={handlePrevStep} className="rounded-xl h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-950 font-bold text-xs sm:text-sm transition inline-flex items-center justify-center gap-2">
                    Back to Payment
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting || isPlacingOrder}
                    className="hidden lg:inline-flex rounded-xl h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 bg-zinc-950 hover:bg-primary hover:shadow-lg hover:shadow-primary/20 text-white font-bold text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center gap-2"
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

          {/* Right Sidebar - Desktop */}
          <aside className="hidden lg:block space-y-6">
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
                        <div className="flex flex-col min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-zinc-950 truncate">
                            {item.name}
                          </p>
                          {item.hsn_code && <span className="text-[10px] text-zinc-500 font-medium mt-0.5">HSN: {item.hsn_code}</span>}
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-500">
                          <span>{item.quantity} × {formatCurrency(getExclusivePrice(item.price, item.is_tax_inclusive, item.igst_rate))}</span>
                          <span className="text-zinc-950">{formatCurrency(getExclusivePrice(item.price * item.quantity, item.is_tax_inclusive, item.igst_rate))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-2 pb-6 border-b border-zinc-100">
                  <div className="flex justify-between text-sm font-medium text-zinc-600">
                    <span>SUBTOTAL (EXCL. GST)</span>
                    <span className="font-bold text-zinc-950">₹{totals.subtotalExclGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {(actualTax > 0 || deliveryCharge > 0 || shippingGst > 0) && (
                    <details className="group">
                      <summary className="flex justify-between text-xs font-bold text-zinc-500 cursor-pointer list-none appearance-none group-hover:text-zinc-700 transition-colors">
                        <span className="flex items-center gap-1">
                          <span className="text-[10px] transition-transform duration-200 group-open:rotate-90">▶</span>
                          TOTAL FEE
                        </span>
                        <span className="text-zinc-700">₹{(actualTax + deliveryCharge + shippingGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </summary>

                      <div className="pt-2 pb-1 space-y-1.5 ml-3">
                        {totals.cgstAmt > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>CGST {totals.orderCgstRate > 0 ? `(${totals.orderCgstRate}%)` : ''}</span>
                            <span>₹{totals.cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {totals.sgstAmt > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>SGST {totals.orderSgstRate > 0 ? `(${totals.orderSgstRate}%)` : ''}</span>
                            <span>₹{totals.sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {totals.igstAmt > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>IGST {totals.orderIgstRate > 0 ? `(${totals.orderIgstRate}%)` : ''}</span>
                            <span>₹{totals.igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {deliveryCharge > 0 && (
                          <div className="flex justify-between text-[11px] font-medium text-zinc-400 pl-2">
                            <span>DELIVERY CHARGE</span>
                            <span>₹{deliveryCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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


                  {deliveryEstimate && (
                    <div className="flex justify-between text-sm font-black text-emerald-700 bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-100/60 mt-4">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Estimated Delivery
                      </span>
                      <span>{deliveryEstimate.date}</span>
                    </div>
                  )}

                  {/* Coupon Application Block */}
                  <div className="pt-4 border-t border-zinc-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Coupon / Promo</span>
                    </div>
                    {!couponsEnabledSetting ? (
                      <p className="text-xs font-bold text-zinc-400 italic">Coupons are currently disabled.</p>
                    ) : appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/50 px-2.5 py-1 rounded-lg inline-block w-fit tracking-wide">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[11px] text-emerald-600 font-bold mt-1">
                            Saved {formatCurrency(discountAmount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs font-bold text-red-500 hover:text-red-700 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={couponCodeInput}
                            onChange={(e) => {
                              setCouponCodeInput(e.target.value);
                              setCouponError(null);
                            }}
                            placeholder="Enter coupon code"
                            className="h-10 border-zinc-200 rounded-xl focus-visible:ring-zinc-950 text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={applyingCoupon}
                            className="px-4 h-10 bg-zinc-950 hover:bg-primary text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            {applyingCoupon ? "Applying..." : "Apply"}
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-[11px] text-red-500 font-semibold">{couponError}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm font-bold text-emerald-600 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/40 mt-3">
                      <span>Coupon Discount</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-lg pt-2">
                  <span className="font-black text-zinc-950">Total</span>
                  <span className="font-black text-primary text-xl">{grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

          {/* Mobile Order Summary - Collapsible (visible below lg) */}
          <div className="lg:hidden">
            <div className="bg-white shadow-sm border border-zinc-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setMobileOrderSummaryOpen(!mobileOrderSummaryOpen)}
                className="w-full flex items-center justify-between p-4 bg-zinc-50/50 border-b border-zinc-100"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-zinc-700" />
                  <span className="text-sm font-black text-zinc-950">Order Summary</span>
                  <span className="text-xs font-bold text-zinc-400">({items.length} {items.length === 1 ? "item" : "items"})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-primary">{grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-300", mobileOrderSummaryOpen && "rotate-180")} />
                </div>
              </button>

              {mobileOrderSummaryOpen && (
                <div className="p-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                  {/* Items List */}
                  <div className="space-y-3 pb-4 border-b border-zinc-100 max-h-[200px] overflow-y-auto">
                    {items.map((item) => (
                      <div key={`mobile-summary-${item.id}`} className="flex gap-3">
                        <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-zinc-50">
                          <Image
                            src={item.image_url || "/images/prod_main.png"}
                            alt={item.name}
                            fill
                            className="object-contain p-1.5"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex flex-col min-w-0">
                            <p className="text-xs font-bold text-zinc-950 truncate">{item.name}</p>
                            {item.variant_attributes && (
                              <div className="text-[9px] text-zinc-400 mt-0.5 truncate">
                                {Object.entries(item.variant_attributes).map(([key, val]) => `${val}`).join(", ")}
                              </div>
                            )}
                            {item.hsn_code && <span className="text-[10px] text-zinc-500 font-medium">HSN: {item.hsn_code}</span>}
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500">
                            <span>{item.quantity} × {formatCurrency(getExclusivePrice(item.price, item.is_tax_inclusive, item.igst_rate))}</span>
                            <span className="text-zinc-950">{formatCurrency(getExclusivePrice(item.price * item.quantity, item.is_tax_inclusive, item.igst_rate))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-zinc-600">
                      <span>SUBTOTAL (EXCL. GST)</span>
                      <span className="font-bold text-zinc-950">₹{totals.subtotalExclGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {(actualTax > 0 || deliveryCharge > 0 || shippingGst > 0) && (
                      <details className="group">
                        <summary className="flex justify-between text-[11px] font-bold text-zinc-500 cursor-pointer list-none appearance-none group-hover:text-zinc-700 transition-colors">
                          <span className="flex items-center gap-1">
                            <span className="text-[9px] transition-transform duration-200 group-open:rotate-90">▶</span>
                            TOTAL FEE
                          </span>
                          <span className="text-zinc-700">₹{(actualTax + deliveryCharge + shippingGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </summary>

                        <div className="pt-2 pb-1 space-y-1.5 ml-3">
                          {totals.cgstAmt > 0 && (
                            <div className="flex justify-between text-[10px] font-medium text-zinc-400 pl-2">
                              <span>CGST {totals.orderCgstRate > 0 ? `(${totals.orderCgstRate}%)` : ''}</span>
                              <span>₹{totals.cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {totals.sgstAmt > 0 && (
                            <div className="flex justify-between text-[10px] font-medium text-zinc-400 pl-2">
                              <span>SGST {totals.orderSgstRate > 0 ? `(${totals.orderSgstRate}%)` : ''}</span>
                              <span>₹{totals.sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {totals.igstAmt > 0 && (
                            <div className="flex justify-between text-[10px] font-medium text-zinc-400 pl-2">
                              <span>IGST {totals.orderIgstRate > 0 ? `(${totals.orderIgstRate}%)` : ''}</span>
                              <span>₹{totals.igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {deliveryCharge > 0 && (
                            <div className="flex justify-between text-[10px] font-medium text-zinc-400 pl-2">
                              <span>DELIVERY CHARGE</span>
                              <span>₹{deliveryCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {shippingGst > 0 && (
                            <div className="flex justify-between text-[10px] font-medium text-zinc-400 pl-2">
                              <span>SHIPPING GST (18%)</span>
                              <span>+₹{shippingGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-emerald-600">
                        <span>Coupon Discount</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {deliveryEstimate && (
                      <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100/60 mt-2">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          Delivery by
                        </span>
                        <span>{deliveryEstimate.date}</span>
                      </div>
                    )}
                  </div>

                  {/* Mobile Coupon Block */}
                  <div className="pt-3 border-t border-zinc-100 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Coupon / Promo</span>
                    {!couponsEnabledSetting ? (
                      <p className="text-xs font-bold text-zinc-400 italic">Coupons are currently disabled.</p>
                    ) : appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/50 px-2 py-0.5 rounded inline-block w-fit">{appliedCoupon.code}</span>
                          <span className="text-[10px] text-emerald-600 font-bold mt-0.5">Saved {formatCurrency(discountAmount)}</span>
                        </div>
                        <button type="button" onClick={handleRemoveCoupon} className="text-[11px] font-bold text-red-500">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={couponCodeInput}
                          onChange={(e) => { setCouponCodeInput(e.target.value); setCouponError(null); }}
                          placeholder="Enter code"
                          className="h-9 border-zinc-200 rounded-lg focus-visible:ring-zinc-950 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={applyingCoupon}
                          className="px-3 h-9 bg-zinc-950 hover:bg-primary text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shrink-0"
                        >
                          {applyingCoupon ? "..." : "Apply"}
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-[10px] text-red-500 font-semibold">{couponError}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <span className="font-black text-zinc-950 text-sm">Total</span>
                    <span className="font-black text-primary text-base">{grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Recommendations - Post Checkout Addons */}
        <div className="mt-8 sm:mt-12 border-t border-zinc-200/60 pt-8 sm:pt-12">
          <RecommendedProducts maxItems={4} />
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-zinc-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 px-4 py-3 safe-area-bottom">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total</span>
              <span className="text-lg font-black text-primary leading-tight">{grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {items.length > 0 && (
                <span className="text-[10px] text-zinc-500 font-medium">{items.length} {items.length === 1 ? "item" : "items"}</span>
              )}
            </div>
            {currentStep < 3 ? (
              <button
                onClick={handleNextStep}
                className="rounded-xl h-11 px-6 bg-zinc-950 hover:bg-primary text-white font-bold text-xs transition inline-flex items-center justify-center gap-1.5"
              >
                {currentStep === 1 ? "Continue" : "Review Order"}
              </button>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={submitting || isPlacingOrder}
                className="rounded-xl h-11 px-6 bg-zinc-950 hover:bg-primary text-white font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                {submitting || isPlacingOrder
                  ? "Processing..."
                  : paymentMethod === "ONLINE"
                    ? "Pay Now"
                    : "Place Order"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
