"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

export default function UserActivityTracker() {
  const supabase = useMemo(() => createClient(), []);
  const lastUpdatedRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function updateActivity() {
      const now = Date.now();
      // Throttle database writes: max once every 60 seconds
      if (now - lastUpdatedRef.current < 60000) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

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
  }, [supabase]);

  return null;
}
