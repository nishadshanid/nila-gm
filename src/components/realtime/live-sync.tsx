"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["workouts", "meal_entries", "water_logs", "habit_logs", "body_metrics"];

/**
 * Refreshes the page when the given person logs something, so their day shows
 * up as it happens without pulling to refresh.
 */
export function LiveSync({ ownerId }: { ownerId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A few taps in a row (glasses of water) refresh once.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 600);
    };

    let channel = supabase.channel(`live-${ownerId}`);
    for (const table of TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `owner_id=eq.${ownerId}` },
        refresh,
      );
    }
    channel.subscribe();

    // Catch up after the phone was asleep or the app was in the background.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router, ownerId]);

  return null;
}
