import { addDays, type DateStr } from "@/lib/dates";
import type { Habit } from "@/lib/types";

/** Whether a day's value meets the habit: ticked, or at least the target. */
export function isMet(habit: Pick<Habit, "kind" | "target">, value: number | undefined): boolean {
  if (value === undefined) return false;
  if (habit.kind === "check" || !habit.target) return value > 0;
  return value >= habit.target;
}

/**
 * Consecutive days met, counting back from today. Today only adds to the streak
 * once it's met; until then the streak runs to yesterday (the day isn't over).
 */
export function streak(metDates: Set<DateStr>, today: DateStr): number {
  let day = metDates.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (metDates.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

/** Days with at least `target` ml of water, from per-day totals. */
export function waterMetDates(totals: Map<DateStr, number>, target: number): Set<DateStr> {
  return new Set([...totals].filter(([, ml]) => ml >= target).map(([date]) => date));
}

/** Adds up water per day. */
export function waterByDay(logs: { date: DateStr; ml: number }[]): Map<DateStr, number> {
  const totals = new Map<DateStr, number>();
  for (const l of logs) totals.set(l.date, (totals.get(l.date) ?? 0) + l.ml);
  return totals;
}

/** Everything for the day is done: training (or a rest day), water, and every habit. */
export function isDayComplete({
  workoutDone,
  restDay,
  waterMl,
  waterTarget,
  habitsMet,
}: {
  workoutDone: boolean;
  restDay: boolean;
  waterMl: number;
  waterTarget: number;
  /** One entry per active habit. */
  habitsMet: boolean[];
}): boolean {
  return (workoutDone || restDay) && waterMl >= waterTarget && habitsMet.every(Boolean);
}

/** "8,500 / 10,000 steps", "6.5 / 7 h". */
export function formatProgress(value: number, habit: Pick<Habit, "target" | "unit">): string {
  const n = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  const unit = habit.unit ? ` ${habit.unit}` : "";
  return habit.target ? `${n(value)} / ${n(habit.target)}${unit}` : `${n(value)}${unit}`;
}

/** "1.75 L" or "750 ml". */
export function formatMl(ml: number): string {
  return ml >= 1000 ? `${Math.round(ml / 10) / 100} L` : `${ml} ml`;
}

export const STARTER_HABITS: Omit<Habit, "id" | "owner_id" | "active">[] = [
  { name: "Steps", icon: "footprints", kind: "number", target: 10000, unit: "steps", position: 0 },
  { name: "Creatine", icon: "pill", kind: "check", target: null, unit: null, position: 1 },
  { name: "Sleep", icon: "moon", kind: "number", target: 7, unit: "h", position: 2 },
  { name: "Vitamins", icon: "citrus", kind: "check", target: null, unit: null, position: 3 },
  { name: "No sugar", icon: "ban", kind: "check", target: null, unit: null, position: 4 },
];
