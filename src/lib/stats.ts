import { isoWeekday, type DateStr } from "@/lib/dates";
import { movingAverage, type WeightPoint } from "@/lib/body";

export type WeekInput = {
  /** The week's days, Monday first, up to and including today. */
  days: DateStr[];
  /** Weekdays (1 = Monday) with a routine in the plan. */
  plannedWeekdays: number[];
  /** Finished workouts this week, with their volume in kg. */
  workouts: { date: DateStr; volume: number }[];
  /** Food per day that has anything logged. */
  food: Map<DateStr, { kcal: number; protein_g: number }>;
  targets: { kcal: number; protein_g: number } | null;
  water: Map<DateStr, number>;
  waterTarget: number;
  /** Per day: how many active habits were met, out of how many. */
  habits: Map<DateStr, { met: number; total: number }>;
  /** Every weigh-in up to the end of the week, oldest first. */
  weights: WeightPoint[];
};

export type WeekStats = {
  days: number;
  workouts: number;
  planned: number;
  volume: number;
  foodDays: number;
  avgKcal: number | null;
  avgProtein: number | null;
  /** Days within 10% of the calorie target, out of days logged. */
  kcalOnTarget: number | null;
  proteinHit: number | null;
  waterDays: number;
  /** Share of habit check-ins met, 0–100. */
  habitRate: number | null;
  /** Trend weight at the end of the week minus at the start; null without both. */
  weightChange: number | null;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function weekStats(w: WeekInput): WeekStats {
  const inWeek = new Set(w.days);
  const food = w.days.flatMap((d) => (w.food.has(d) ? [w.food.get(d)!] : []));
  const kcal = avg(food.map((f) => f.kcal));
  const protein = avg(food.map((f) => f.protein_g));

  let met = 0;
  let total = 0;
  for (const d of w.days) {
    const h = w.habits.get(d);
    if (h) {
      met += h.met;
      total += h.total;
    }
  }

  const trend = movingAverage(w.weights);
  const before = trend.filter((p) => p.date < w.days[0]).at(-1);
  const end = trend.filter((p) => inWeek.has(p.date)).at(-1);
  const first = trend.find((p) => inWeek.has(p.date));
  const start = before ?? (first && first !== end ? first : undefined);

  return {
    days: w.days.length,
    workouts: w.workouts.filter((x) => inWeek.has(x.date)).length,
    planned: w.days.filter((d) => w.plannedWeekdays.includes(isoWeekday(d))).length,
    volume: Math.round(w.workouts.reduce((t, x) => t + (inWeek.has(x.date) ? x.volume : 0), 0)),
    foodDays: food.length,
    avgKcal: kcal === null ? null : Math.round(kcal),
    avgProtein: protein === null ? null : Math.round(protein),
    kcalOnTarget: w.targets
      ? food.filter((f) => Math.abs(f.kcal - w.targets!.kcal) <= w.targets!.kcal * 0.1).length
      : null,
    proteinHit: w.targets ? food.filter((f) => f.protein_g >= w.targets!.protein_g).length : null,
    waterDays: w.days.filter((d) => (w.water.get(d) ?? 0) >= w.waterTarget).length,
    habitRate: total ? Math.round((met / total) * 100) : null,
    weightChange: start && end ? Math.round((end.avg - start.avg) * 10) / 10 : null,
  };
}
