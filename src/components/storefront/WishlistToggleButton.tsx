"use client";

import { Heart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoginRedirect } from "@/hooks/useLoginRedirect";
import { useWishlistStatus, useToggleWishlist } from "@/hooks/api/useWishlist";
import { useAuthStore } from "@/store/useAuthStore";

type Props = {
  productId: string;
  className?: string;
  label?: string;
  onAdded?: () => void;
  variant?: "wishlist" | "save-later";
};

export default function WishlistToggleButton({
  productId,
  className,
  label,
  onAdded,
  variant = "wishlist"
}: Props) {
  const { redirectToLogin } = useLoginRedirect();
  const user = useAuthStore((state) => state.user);
  const { data: entryId, isLoading } = useWishlistStatus(productId);
  const { mutate: toggleWishlist, isPending } = useToggleWishlist();

  const handleToggle = () => {
    if (!user) {
      redirectToLogin();
      return;
    }

    toggleWishlist({ productId, entryId: entryId || null }, {
      onSuccess: (data) => {
        if (data.action === "added" && onAdded) {
          onAdded();
        }
      }
    });
  };

  const Icon = variant === "save-later" ? Bookmark : Heart;
  const buttonLabel = label !== undefined ? label : (variant === "save-later" ? "Save for Later" : "Save");

  return (
    <button
      disabled={isLoading || isPending}
      onClick={handleToggle}
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 h-11 px-6",
        className
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          entryId ? "fill-current text-primary" : "text-zinc-400",
          buttonLabel ? "mr-2" : ""
        )}
      />
      {buttonLabel && (entryId ? "Saved" : buttonLabel)}
    </button>
  );
}
