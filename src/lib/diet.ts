import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { recentFoodIds } from "@/lib/nutrition";
import type { Food, MealEntry, MealIdea } from "@/lib/types";

function check<T>(result: { data: unknown; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
}

const NUMBERS = ["kcal", "protein_g", "carbs_g", "fat_g", "fibre_g"] as const;

/** Postgres numerics can arrive as strings; make sure they're numbers. */
function numeric<T extends Record<(typeof NUMBERS)[number], unknown>>(
  row: T,
  extra: string[] = [],
) {
  const out = { ...row } as Record<string, unknown>;
  for (const key of [...NUMBERS, ...extra]) out[key] = Number(out[key]);
  return out as T;
}

export const FOOD_COLUMNS =
  "id, owner_id, name, unit, serving, default_amount, kcal, protein_g, carbs_g, fat_g, fibre_g";

/** Built-in foods plus both of your own, by name. Cached per request. */
export const getFoods = cache(async (): Promise<Food[]> => {
  const supabase = await createClient();
  const rows = check<Food[]>(
    await supabase.from("foods").select(FOOD_COLUMNS).order("name").limit(5000),
    "foods",
  );
  return rows.map((f) => numeric(f, ["default_amount"]));
});

/** Someone's log for a day, in the order it was eaten. */
export async function getDayEntries(ownerId: string, date: string): Promise<MealEntry[]> {
  const supabase = await createClient();
  const rows = check<MealEntry[]>(
    await supabase
      .from("meal_entries")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("date", date)
      .order("created_at"),
    "meals",
  );
  return rows.map((e) => numeric(e, ["amount"]));
}

/** Foods you logged lately, newest first. */
export async function getRecentFoodIds(ownerId: string): Promise<string[]> {
  const supabase = await createClient();
  const rows = check<Pick<MealEntry, "food_id">[]>(
    await supabase
      .from("meal_entries")
      .select("food_id")
      .eq("owner_id", ownerId)
      .not("food_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200),
    "recent foods",
  );
  return recentFoodIds(rows, 15);
}

export async function getFavouriteIds(ownerId: string): Promise<string[]> {
  const supabase = await createClient();
  const rows = check<{ food_id: string }[]>(
    await supabase
      .from("favourite_foods")
      .select("food_id")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    "favourites",
  );
  return rows.map((r) => r.food_id);
}

/** Someone's meal ideas, by meal and position, with their foods in order. */
export async function getMealIdeas(ownerId: string): Promise<MealIdea[]> {
  const supabase = await createClient();
  const rows = check<MealIdea[]>(
    await supabase
      .from("meal_ideas")
      .select(
        "id, owner_id, position, meal, name, hint, note, items:meal_idea_items(id, position, food_id, amount, optional)",
      )
      .eq("owner_id", ownerId)
      .order("position"),
    "meal ideas",
  );
  return rows.map((idea) => ({
    ...idea,
    items: idea.items
      .map((i) => ({ ...i, amount: Number(i.amount) }))
      .sort((a, b) => a.position - b.position),
  }));
}
