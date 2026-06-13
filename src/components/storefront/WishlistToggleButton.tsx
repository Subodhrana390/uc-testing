"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoginRedirect } from "@/hooks/useLoginRedirect";
import { useWishlistStatus, useToggleWishlist } from "@/hooks/api/useWishlist";

type Props = {
  productId: string;
  className?: string;
  label?: string;
  onAdded?: () => void;
};

export default function WishlistToggleButton({ productId, className, label = "Save", onAdded }: Props) {
  const { redirectToLogin } = useLoginRedirect();
  const { data: entryId, isLoading } = useWishlistStatus(productId);
  const { mutate: toggleWishlist, isPending } = useToggleWishlist();

  const handleToggle = () => {
    // We can't synchronously check auth here easily without flashing, but the mutation handles the auth error gracefully.
    // Actually, to redirect properly, we can rely on the mutation error, but catching it here is better.
    // For now, the mutation throws an error which toast catches. But we also want to redirect.
    toggleWishlist({ productId, entryId: entryId || null }, {
      onError: (err) => {
        if (err.message.includes("login")) {
          redirectToLogin();
        }
      },
      onSuccess: (data) => {
        if (data.action === "added" && onAdded) {
          onAdded();
        }
      }
    });
  };

  return (
    <button
      disabled={isLoading || isPending}
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
