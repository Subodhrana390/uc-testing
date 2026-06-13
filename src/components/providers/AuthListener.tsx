"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthListener() {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  return null;
}
