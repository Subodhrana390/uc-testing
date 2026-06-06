"use client";

import { useState, useMemo } from "react";
import { MapPin, Truck, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

export default function DeliveryEstimator() {
  const [pincode, setPincode] = useState("");
  const [estimation, setEstimation] = useState<{
    days: string;
    type: string;
    available: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const checkDelivery = async () => {
    if (pincode.length !== 6) return;

    setLoading(true);
    try {
      const prefix = pincode.substring(0, 2);
      const { data: zones, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("active", true);

      if (error) throw error;

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

      if (matchedZone) {
        setEstimation({
          days: matchedZone.estimate,
          type: matchedZone.name,
          available: true
        });
      } else {
        setEstimation({
          days: "5-7 Days",
          type: "Standard Shipping",
          available: true
        });
      }
    } catch (err) {
      console.error("Delivery check error:", err);
      setEstimation({
        days: "5-7 Days",
        type: "Standard Shipping",
        available: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2 border-zinc-100">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-zinc-400" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Delivery Check</h3>
      </div>

      <div className="flex gap-2 max-w-sm">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          className="flex-1 h-10 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:outline-none focus:border-zinc-400 placeholder:text-zinc-300 transition-all"
        />
        <button
          onClick={checkDelivery}
          disabled={pincode.length !== 6 || loading}
          className="h-10 px-5 bg-zinc-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all disabled:opacity-50 active:scale-95"
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {estimation && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-3 text-xs text-zinc-600 flex flex-col gap-1"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-zinc-950">Estimated Arrival:</span>
              <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {estimation.days}
              </span>
              <span className="text-zinc-400 font-bold uppercase tracking-tighter text-[10px]">({estimation.type})</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Order before 2 PM for same-day dispatch</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!estimation && (
        <div className="mt-3 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-zinc-300" />
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
            Usually dispatched within 24 hours of order confirmation.
          </p>
        </div>
      )}
    </div>
  );
}
