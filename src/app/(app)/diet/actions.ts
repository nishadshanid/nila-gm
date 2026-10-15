"use server";

import { refresh, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FOOD_COLUMNS } from "@/lib/diet";
import { nutrientsFor } from "@/lib/nutrition";
import type { Food, Meal } from "@/lib/types";
import {
  addEntrySchema,
  foodInputSchema,
  quickAddSchema,
  targetsSchema,
  updateEntrySchema,
  type AddEntryInput,
  type FoodInput,
  type QuickAddInput,
  type TargetsInput,
  type UpdateEntryInput,
} from "@/lib/diet-schema";

export type ActionResult = { ok: true } | { ok: false; error: string };
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const signedOut = { ok: false as const, error: "You're signed out." };

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function invalid(error: { issues: { message: string }[] }, what: string) {
  return { ok: false as const, error: error.issues[0]?.message ?? `Invalid ${what}` };
}

/** Logs an amount of a food. Its nutrition is copied in, so later edits to the food don't change history. */
export async function addEntry(input: AddEntryInput): Promise<ActionResult> {
  const parsed = addEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "entry");
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { date, meal, food_id, amount } = parsed.data;

  const found = await supabase.from("foods").select(FOOD_COLUMNS).eq("id", food_id).single();
  if (found.error) return { ok: false, error: found.error.message };
  const food = found.data as Food;

  const { error } = await supabase.from("meal_entries").insert({
    date,
    meal,
    food_id,
    name: food.name,
    amount,
    unit: food.unit,
    serving: food.serving,
    ...nutrientsFor(food, amount),
  });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Just the numbers, for when the food isn't in the list. */
export async function quickAdd(input: QuickAddInput): Promise<ActionResult> {
  const parsed = quickAddSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "entry");
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } = await supabase
    .from("meal_entries")
    .insert({ ...parsed.data, amount: 1, unit: null, fibre_g: 0 });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Changes the amount or the meal. Nutrition scales with the amount. */
export async function updateEntry(id: string, input: UpdateEntryInput): Promise<ActionResult> {
  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "entry");
  const { supabase, user } = await me();
  if (!user) return signedOut;

  const found = await supabase
    .from("meal_entries")
    .select("amount, unit, kcal, protein_g, carbs_g, fat_g, fibre_g")
    .eq("id", id)
    .single();
  if (found.error) return { ok: false, error: found.error.message };
  const old = found.data;

  // Quick adds have no amount to scale.
  const amount = old.unit ? parsed.data.amount : Number(old.amount);
  const factor = amount / Number(old.amount);
  const scale = (n: number) => Math.round(Number(n) * factor * 10) / 10;
  const { error } = await supabase
    .from("meal_entries")
    .update({
      meal: parsed.data.meal,
      amount,
      kcal: Math.round(Number(old.kcal) * factor),
      protein_g: scale(old.protein_g),
      carbs_g: scale(old.carbs_g),
      fat_g: scale(old.fat_g),
      fibre_g: scale(old.fibre_g),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const { supabase } = await me();
  const { error } = await supabase.from("meal_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Copies one meal from one day to another, e.g. yesterday's breakfast to today. */
export async function copyMeal(
  from: string,
  to: string,
  meal: Meal,
): Promise<Result<{ count: number }>> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const found = await supabase
    .from("meal_entries")
    .select("food_id, name, amount, unit, serving, kcal, protein_g, carbs_g, fat_g, fibre_g")
    .eq("owner_id", user.id)
    .eq("date", from)
    .eq("meal", meal)
    .order("created_at");
  if (found.error) return { ok: false, error: found.error.message };
  if (found.data.length === 0) return { ok: true, count: 0 };
  const { error } = await supabase
    .from("meal_entries")
    .insert(found.data.map((e) => ({ ...e, date: to, meal })));
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, count: found.data.length };
}

export async function setFavourite(foodId: string, on: boolean): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } = on
    ? await supabase
        .from("favourite_foods")
        .upsert({ owner_id: user.id, food_id: foodId }, { ignoreDuplicates: true })
    : await supabase.from("favourite_foods").delete().eq("owner_id", user.id).eq("food_id", foodId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Creates your own food, or edits it when `id` is given. */
export async function saveFood(input: FoodInput, id?: string): Promise<Result<{ food: Food }>> {
  const parsed = foodInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "food");
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const saved = id
    ? await supabase.from("foods").update(parsed.data).eq("id", id).select(FOOD_COLUMNS).single()
    : await supabase.from("foods").insert(parsed.data).select(FOOD_COLUMNS).single();
  if (saved.error) return { ok: false, error: saved.error.message };
  revalidatePath("/diet", "layout");
  return { ok: true, food: saved.data as Food };
}

/** Deletes your own food. Meals you already logged with it stay as they were. */
export async function deleteFood(id: string): Promise<ActionResult> {
  const { supabase } = await me();
  const { error } = await supabase.from("foods").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function saveTargets(input: TargetsInput): Promise<ActionResult> {
  const parsed = targetsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "targets");
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
