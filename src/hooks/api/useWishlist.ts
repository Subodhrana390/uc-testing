"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";

const supabase = createClient();

export function useWishlistStatus(productId: string) {
  return useQuery({
    queryKey: ["wishlist", productId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      return data?.id || null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, entryId }: { productId: string; entryId: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please login to save wishlist items");
      }

      if (entryId) {
        const { error } = await supabase.from("wishlist").delete().eq("id", entryId);
        if (error) throw new Error(error.message || "Unable to update wishlist");
        return { action: "removed", productId };
      }

      const { data, error } = await supabase
        .from("wishlist")
        .insert([{ user_id: user.id, product_id: productId }])
        .select("id")
        .single();

      if (error) throw new Error(error.message || "Unable to update wishlist");
      return { action: "added", productId, entryId: data.id };
    },
    onMutate: async ({ productId, entryId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["wishlist", productId] });
      const previousStatus = queryClient.getQueryData(["wishlist", productId]);
      queryClient.setQueryData(["wishlist", productId], entryId ? null : "temp-id");
      return { previousStatus, productId };
    },
    onError: (err, newTodo, context) => {
      // Revert on error
      if (context) {
        queryClient.setQueryData(["wishlist", context.productId], context.previousStatus);
      }
      toast.error(err.message);
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ["wishlist", variables.productId] });
      
      if (data) {
        toast.success(data.action === "added" ? "Saved to wishlist" : "Removed from wishlist");
        window.dispatchEvent(new CustomEvent("wishlist-updated"));
      }
    },
  });
}
