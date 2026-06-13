"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

import { useAuthStore } from "@/store/useAuthStore";

export default function UserActivityTracker() {
  const supabase = useMemo(() => createClient(), []);
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const lastUpdatedRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function updateActivity() {
      const now = Date.now();
      // Throttle database writes: max once every 60 seconds
      if (now - lastUpdatedRef.current < 60000) return;

      try {
        if (user && active) {
          lastUpdatedRef.current = now;
          await supabase
            .from("profiles")
            .update({ last_activity: new Date().toISOString() })
            .eq("id", user.id);
        }
      } catch (err) {
        console.error("Failed to update user activity status:", err);
      }
    }

    // Trigger on initial mount
    updateActivity();

    // Listen to user interaction events
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      active = false;
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [supabase, user, isAuthInitialized]);

  return null;
}
