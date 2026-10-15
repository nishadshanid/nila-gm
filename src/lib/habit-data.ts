import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, type DateStr } from "@/lib/dates";
import { isMet, streak, waterByDay, waterMetDates } from "@/lib/habits";
import type { Habit, HabitLog } from "@/lib/types";

/** How far back streaks and history look. */
const WINDOW_DAYS = 60;

function check<T>(result: { data: unknown; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
}

export type HabitDay = {
  habits: Habit[];
  /** Today's value per habit id. */
  values: Record<string, number>;
  /** Current streak per habit id. */
  streaks: Record<string, number>;
  /** Met or not for the last 7 days (oldest first), per habit id. */
  week: Record<string, boolean[]>;
  water: { ml: number; streak: number; week: number[] };
};

/** Someone's active habits, water and streaks as of `today`. */
export async function getHabitDay(
  ownerId: string,
  today: DateStr,
  waterTarget: number,
): Promise<HabitDay> {
  const supabase = await createClient();
  const from = addDays(today, -WINDOW_DAYS);
  const [habitRows, logRows, waterRows] = await Promise.all([
    supabase
      .from("habits")
      .select("id, owner_id, name, emoji, kind, target, unit, active, position")
      .eq("owner_id", ownerId)
      .eq("active", true)
      .order("position")
      .order("created_at"),
    supabase
      .from("habit_logs")
      .select("habit_id, date, value")
      .eq("owner_id", ownerId)
      .gte("date", from)
      .lte("date", today)
      // Newest first, so the row cap never cuts off recent days.
      .order("date", { ascending: false }),
    supabase
      .from("water_logs")
      .select("date, ml")
      .eq("owner_id", ownerId)
      .gte("date", from)
      .lte("date", today)
      .order("date", { ascending: false }),
  ]);
  const habits = check<Habit[]>(habitRows, "habits").map((h) => ({
    ...h,
    target: h.target === null ? null : Number(h.target),
  }));
  const logs = check<HabitLog[]>(logRows, "habit logs");
  const water = waterByDay(check<{ date: string; ml: number }[]>(waterRows, "water"));
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const values: Record<string, number> = {};
  const streaks: Record<string, number> = {};
  const week: Record<string, boolean[]> = {};
  for (const h of habits) {
    const byDate = new Map<string, number>();
    for (const l of logs) if (l.habit_id === h.id) byDate.set(l.date, Number(l.value));
    const met = new Set([...byDate].filter(([, v]) => isMet(h, v)).map(([d]) => d));
    if (byDate.has(today)) values[h.id] = byDate.get(today)!;
    streaks[h.id] = streak(met, today);
    week[h.id] = last7.map((d) => met.has(d));
  }

  return {
    habits,
    values,
    streaks,
    week,
    water: {
      ml: water.get(today) ?? 0,
      streak: streak(waterMetDates(water, waterTarget), today),
      week: last7.map((d) => water.get(d) ?? 0),
    },
  };
}
