"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";

type Props = {
  productId: string;
  className?: string;
  label?: string;
};

export default function WishlistToggleButton({ productId, className, label = "Save" }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadState() {
      const {
        data: { user },
      } = await (supabase.auth as any).getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      setEntryId(data?.id || null);
      setLoading(false);
    }

    loadState();
  }, [productId, supabase]);

  async function handleToggle() {
    const {
      data: { user },
    } = await (supabase.auth as any).getUser();

    if (!user) {
      toast("Please login to save wishlist items");
      router.push("/login");
      return;
    }

    if (entryId) {
      const { error } = await supabase.from("wishlist").delete().eq("id", entryId);
      if (error) {
        toast.error(error.message || "Unable to update wishlist");
        return;
      }
      setEntryId(null);
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
      toast.success("Removed from wishlist");
      return;
    }

    const { data, error } = await supabase
      .from("wishlist")
      .insert([{ user_id: user.id, product_id: productId }])
      .select("id")
      .single();

    if (error) {
      toast.error(error.message || "Unable to update wishlist");
      return;
    }

    setEntryId(data.id);
    window.dispatchEvent(new CustomEvent("wishlist-updated"));
    toast.success("Saved to wishlist");
  }

  return (
    <button
      disabled={loading}
      onClick={handleToggle}
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 h-11 px-6",
        className
      )}
    >
      <Heart
        className={`h-5 w-5 ${entryId ? "fill-current text-primary" : "text-zinc-400"} ${label ? "mr-2" : ""}`}
      />
      {label && (entryId ? "Saved" : label)}
    </button>
  );
}
