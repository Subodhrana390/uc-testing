"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export default function WishlistButton({ className, onClick }: { className?: string; onClick?: (e: React.MouseEvent) => void }) {
  const [count, setCount] = useState(0);
  const supabase = createClient();
  const user = useAuthStore((state) => state.user);

  async function updateCount() {
    if (!user) {
      setCount(0);
      return;
    }

    try {
      const { count: wishlistCount, error } = await supabase
        .from("wishlist")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!error) {
        setCount(wishlistCount || 0);
      }
    } catch (error) {
      console.error("Error fetching wishlist count:", error);
    }
  }

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    updateCount();
    
    // Listen for custom event
    window.addEventListener("wishlist-updated", updateCount);

    return () => {
      window.removeEventListener("wishlist-updated", updateCount);
    };
  }, [user]);

  return (
    <Link prefetch={false} 
      href="/account/wishlist" 
      onClick={(e) => {
        if (window.innerWidth < 640 && onClick) {
          e.preventDefault();
          onClick(e);
        }
      }}
      className={className || "inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-primary transition-colors"}
    >
      <div className="relative">
        <Heart className={className ? "h-5 w-5 text-primary" : "h-5 w-5"} />
        {count > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white shadow-sm">
            {count}
          </span>
        )}
      </div>
      <span className={className ? "text-xs font-bold uppercase tracking-wider" : "hidden sm:inline"}>
        Wishlist
      </span>
    </Link>
  );
}
