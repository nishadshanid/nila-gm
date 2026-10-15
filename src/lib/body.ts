import { addDays, daysBetween, type DateStr } from "@/lib/dates";

export type WeightPoint = { date: DateStr; kg: number };
export type TrendPoint = WeightPoint & { avg: number };

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Each weigh-in with the average of the weigh-ins in the 7 days up to it. The
 * average smooths out water and food swings, so it's the number to watch.
 * `points` must be sorted oldest first.
 */
export function movingAverage(points: WeightPoint[], days = 7): TrendPoint[] {
  return points.map((p, i) => {
    const from = addDays(p.date, -(days - 1));
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0 && points[j].date >= from; j--) {
      sum += points[j].kg;
      n++;
    }
    return { ...p, avg: round2(sum / n) };
  });
}

/** The trend value on or before a date, or null if there's none. */
function trendAt(trend: TrendPoint[], date: DateStr): number | null {
  for (let i = trend.length - 1; i >= 0; i--) if (trend[i].date <= date) return trend[i].avg;
  return null;
}

export type WeightSummary = {
  /** Latest 7-day average. */
  current: number;
  latest: WeightPoint;
  /** Average now minus the average a week ago; null without a reading back then. */
  weekChange: number | null;
  /** Average now minus the first weigh-in. */
  sinceStart: number;
  start: WeightPoint;
};

export function summarize(trend: TrendPoint[]): WeightSummary | null {
  if (trend.length === 0) return null;
  const last = trend[trend.length - 1];
  const weekAgo = trendAt(trend, addDays(last.date, -7));
  return {
    current: last.avg,
    latest: { date: last.date, kg: last.kg },
    weekChange: weekAgo === null ? null : round1(last.avg - weekAgo),
    sinceStart: round1(last.avg - trend[0].kg),
    start: { date: trend[0].date, kg: trend[0].kg },
  };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

/** WHO bands, with the lower Asian cut-offs for overweight (23) and obese (27.5). */
export function bmiLabel(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 23) return "Healthy";
  if (value < 27.5) return "Overweight";
  return "Obese";
}

/** "+0.4 kg", "−1.2 kg", "±0 kg". */
export function formatChange(kg: number, unit = "kg"): string {
  if (kg === 0) return `±0 ${unit}`;
  return `${kg > 0 ? "+" : "−"}${Math.abs(kg)} ${unit}`;
}

export type Chart = {
  dots: { x: number; y: number; date: DateStr; kg: number }[];
  /** SVG path for the moving average. */
  line: string;
  /** Gridlines with their kg labels. */
  ticks: { y: number; kg: number }[];
};

/**
 * Lays the weigh-ins out in a width × height box: x by date, y by kg with a little
 * headroom, plus "nice" gridlines.
 */
export function buildChart(
  trend: TrendPoint[],
  width: number,
  height: number,
  pad = { top: 8, right: 8, bottom: 8, left: 36 },
): Chart {
  if (trend.length === 0) return { dots: [], line: "", ticks: [] };
  const values = trend.flatMap((p) => [p.kg, p.avg]);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 2) {
    const mid = (hi + lo) / 2;
    lo = mid - 1;
    hi = mid + 1;
  }
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;

  const first = trend[0].date;
  const span = Math.max(1, daysBetween(first, trend[trend.length - 1].date));
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const x = (d: DateStr) =>
    round1(pad.left + (trend.length === 1 ? w / 2 : (daysBetween(first, d) / span) * w));
  const y = (kg: number) => round1(pad.top + (1 - (kg - lo) / (hi - lo)) * h);

  const ticks: Chart["ticks"] = [];
  for (let kg = lo; kg <= hi + step / 2; kg += step) ticks.push({ y: y(kg), kg: round1(kg) });
  return {
    dots: trend.map((p) => ({ x: x(p.date), y: y(p.kg), date: p.date, kg: p.kg })),
    line: trend.map((p, i) => `${i ? "L" : "M"}${x(p.date)} ${y(p.avg)}`).join(" "),
    ticks,
  };
}

function niceStep(raw: number): number {
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
  return steps.find((s) => s >= raw) ?? 100;
}

export const MEASUREMENTS = [
  { key: "waist_cm", label: "Waist" },
  { key: "chest_cm", label: "Chest" },
  { key: "arms_cm", label: "Arms" },
  { key: "hips_cm", label: "Hips" },
  { key: "thighs_cm", label: "Thighs" },
] as const;
