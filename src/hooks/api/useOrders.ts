import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export function useOrders() {
  const user = useAuthStore((state) => state.user);
  const supabase = createClient();

  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id, quantity, unit_price,
            products (id, name, slug, image_url, igst_rate, cgst_rate, sgst_rate, is_tax_inclusive, hsn_code)
          ),
          payments (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useOrderDetails(orderId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id, quantity, unit_price,
            products (id, name, slug, image_url, igst_rate, cgst_rate, sgst_rate, is_tax_inclusive, hsn_code)
          ),
          payments (*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}
