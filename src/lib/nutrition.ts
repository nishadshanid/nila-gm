import type { Activity, Food, FoodUnit, Goal, Meal, MealEntry, Nutrients } from "@/lib/types";

export const MEALS: { value: Meal; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🍳" },
  { value: "lunch", label: "Lunch", emoji: "🍛" },
  { value: "snack", label: "Snacks", emoji: "🍌" },
  { value: "dinner", label: "Dinner", emoji: "🌙" },
];

export const ACTIVITIES: { value: Activity; label: string; hint: string; factor: number }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little walking", factor: 1.2 },
  { value: "light", label: "Light", hint: "Gym 1–3 days a week", factor: 1.375 },
  { value: "moderate", label: "Moderate", hint: "Gym 3–5 days a week", factor: 1.55 },
  { value: "active", label: "Active", hint: "Hard training 6–7 days", factor: 1.725 },
  { value: "very_active", label: "Very active", hint: "Physical job plus training", factor: 1.9 },
];

export const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: "cut", label: "Lose fat", hint: "About 20% under maintenance" },
  { value: "maintain", label: "Maintain", hint: "Stay where you are" },
  { value: "bulk", label: "Build muscle", hint: "About 10% over maintenance" },
];

const GOAL_FACTOR: Record<Goal, number> = { cut: 0.8, maintain: 1, bulk: 1.1 };
/** Protein per kg of body weight: higher while cutting to keep muscle. */
const PROTEIN_PER_KG: Record<Goal, number> = { cut: 2, maintain: 1.6, bulk: 1.8 };

export const ZERO: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 };

export type BodyStats = {
  sex: "male" | "female";
  weightKg: number;
  heightCm: number;
  age: number;
  activity: Activity;
  goal: Goal;
};

export type Targets = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

/** Resting burn (Mifflin-St Jeor), in kcal a day. */
export function bmr({ sex, weightKg, heightCm, age }: Omit<BodyStats, "activity" | "goal">) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

/** Calories to stay at the same weight. */
export function maintenanceKcal(stats: BodyStats): number {
  const factor = ACTIVITIES.find((a) => a.value === stats.activity)?.factor ?? 1.55;
  return Math.round(bmr(stats) * factor);
}

/**
 * Suggested daily targets: maintenance adjusted for the goal (rounded to 50 kcal),
 * protein by body weight, fat at a quarter of calories, carbs the rest.
 */
export function suggestTargets(stats: BodyStats): Targets {
  const kcal = Math.round((maintenanceKcal(stats) * GOAL_FACTOR[stats.goal]) / 50) * 50;
  const protein = Math.round(stats.weightKg * PROTEIN_PER_KG[stats.goal]);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein_g: protein, carbs_g: carbs, fat_g: fat };
}

export function ageFrom(birthYear: number, today: string): number {
  return Number(today.slice(0, 4)) - birthYear;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrition for an amount of a food: grams/ml (values are per 100) or pieces. */
export function nutrientsFor(
  food: Pick<Food, "unit" | keyof Nutrients>,
  amount: number,
): Nutrients {
  const factor = food.unit === "piece" ? amount : amount / 100;
  return {
    kcal: Math.round(Number(food.kcal) * factor),
    protein_g: round1(Number(food.protein_g) * factor),
    carbs_g: round1(Number(food.carbs_g) * factor),
    fat_g: round1(Number(food.fat_g) * factor),
    fibre_g: round1(Number(food.fibre_g) * factor),
  };
}

/** Adds up entries' nutrition. */
export function sum(entries: Nutrients[]): Nutrients {
  const t = { ...ZERO };
  for (const e of entries) {
    t.kcal += Number(e.kcal);
    t.protein_g += Number(e.protein_g);
    t.carbs_g += Number(e.carbs_g);
    t.fat_g += Number(e.fat_g);
    t.fibre_g += Number(e.fibre_g);
  }
  return {
    kcal: Math.round(t.kcal),
    protein_g: round1(t.protein_g),
    carbs_g: round1(t.carbs_g),
    fat_g: round1(t.fat_g),
    fibre_g: round1(t.fibre_g),
  };
}

/** Entries grouped by meal, in meal order (every meal present, maybe empty). */
export function byMeal<T extends Pick<MealEntry, "meal">>(entries: T[]): Record<Meal, T[]> {
  const groups: Record<Meal, T[]> = { breakfast: [], lunch: [], snack: [], dinner: [] };
  for (const e of entries) groups[e.meal].push(e);
  return groups;
}

/** The meal that fits the time of day (IST hour). */
export function mealForHour(hour: number): Meal {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 19) return "snack";
  return "dinner";
}

function plural(word: string, n: number): string {
  if (n === 1) return word;
  return /(s|sh|ch|x)$/.test(word) ? `${word}es` : `${word}s`;
}

const trim = (n: number) => String(Math.round(n * 100) / 100);

/** "150 g", "200 ml", "2 chapatis", "½ scoop". */
export function formatAmount(amount: number, unit: FoodUnit | null, serving: string | null) {
  if (!unit) return "";
  if (unit !== "piece") return `${trim(amount)} ${unit}`;
  const n = amount === 0.5 ? "½" : amount === 0.25 ? "¼" : trim(amount);
  return `${n} ${plural(serving || "piece", amount > 1 ? 2 : 1)}`;
}

/** "per 100 g" or "per chapati". */
export function perLabel(food: Pick<Food, "unit" | "serving">): string {
  return food.unit === "piece" ? `per ${food.serving || "piece"}` : `per 100 ${food.unit}`;
}

/** How much the − / + buttons change an amount. */
export function amountStep(unit: FoodUnit): number {
  return unit === "piece" ? 0.5 : unit === "ml" ? 50 : 25;
}

/** Most recently logged foods first, each once. `entries` must be newest first. */
export function recentFoodIds(entries: Pick<MealEntry, "food_id">[], limit = 12): string[] {
  const ids: string[] = [];
  for (const e of entries) {
    if (e.food_id && !ids.includes(e.food_id)) ids.push(e.food_id);
    if (ids.length >= limit) break;
  }
  return ids;
}

/** Simple word search: every word must appear in the name. */
export function matchesFood(name: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = name.toLowerCase();
  return words.every((w) => hay.includes(w));
}
