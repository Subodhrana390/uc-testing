import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export function useSiteSettings() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["siteSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
    staleTime: 60 * 60 * 1000, // 1 hour caching
  });
}
