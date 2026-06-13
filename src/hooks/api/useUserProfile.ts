import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export function useUserProfile() {
  const user = useAuthStore((state) => state.user);
  const supabase = createClient();

  return useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
