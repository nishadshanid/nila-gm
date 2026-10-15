"use client";

import { useEffect } from "react";
import { PartyPopper } from "lucide-react";
import { tapFeedback } from "@/lib/haptics";
import { confetti } from "./confetti";

const seen = new Set<string>();

/** Celebrates once per day and view; the card stays while everything is done. */
function firstTime(key: string) {
  if (seen.has(key)) return false;
  seen.add(key);
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
  } catch {}
  return true;
}

/**
 * "All done for today": shown on Today once training (or a rest day), water and
 * every habit are done. The first time it happens that day, confetti!
 */
export function DayComplete({ date, detail }: { date: string; detail: string }) {
  useEffect(() => {
    if (!firstTime(`nila-gym.celebrated.${date}`)) return;
    tapFeedback();
    confetti();
  }, [date]);

  return (
    <div
      role="status"
      className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
    >
      <PartyPopper className="size-6 shrink-0" />
      <div>
        <p className="font-semibold">All done for today</p>
        <p className="text-sm opacity-80">{detail}</p>
      </div>
    </div>
  );
}
