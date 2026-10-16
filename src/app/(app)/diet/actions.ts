"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
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

const MEALS_ENUM = z.enum(["breakfast", "lunch", "snack", "dinner"]);
const ideaItemsSchema = z
  .array(
    z.object({
      food_id: z.uuid(),
      amount: z.number().positive().max(5000),
      optional: z.boolean().optional().default(false),
    }),
  )
  .min(1, "Add at least one food")
  .max(20);

/** Logs an idea's foods (the ones you kept, at your amounts) in one go. */
export async function logIdea(
  date: string,
  meal: Meal,
  items: { food_id: string; amount: number }[],
): Promise<Result<{ count: number }>> {
  const parsed = z
    .object({ date: z.iso.date(), meal: MEALS_ENUM, items: ideaItemsSchema })
    .safeParse({ date, meal, items });
  if (!parsed.success) return invalid(parsed.error, "meal");
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const ids = [...new Set(parsed.data.items.map((i) => i.food_id))];
  const found = await supabase.from("foods").select(FOOD_COLUMNS).in("id", ids);
  if (found.error) return { ok: false, error: found.error.message };
  const byId = new Map((found.data as Food[]).map((f) => [f.id, f]));
  const rows = parsed.data.items.flatMap(({ food_id, amount }) => {
    const food = byId.get(food_id);
    if (!food) return [];
    const rounded = Math.round(amount * 100) / 100;
    return [
      {
        date: parsed.data.date,
        meal: parsed.data.meal,
        food_id,
        name: food.name,
        amount: rounded,
        unit: food.unit,
        serving: food.serving,
        ...nutrientsFor(food, rounded),
      },
    ];
  });
  const { error } = await supabase.from("meal_entries").insert(rows);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, count: rows.length };
}

const ideaSchema = z.object({
  meal: MEALS_ENUM,
  name: z.string().trim().min(1, "Give it a name").max(60),
  hint: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .transform((v) => v || null),
  note: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .transform((v) => v || null),
  items: ideaItemsSchema,
});
export type IdeaInput = z.input<typeof ideaSchema>;

/** Creates a meal idea, or replaces one (and its foods) when `id` is given. */
export async function saveIdea(input: IdeaInput, id?: string): Promise<Result<{ id: string }>> {
  const parsed = ideaSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, "idea");
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { items, ...idea } = parsed.data;
  let ideaId = id;
  if (id) {
    const { error } = await supabase.from("meal_ideas").update(idea).eq("id", id);
    if (error) return { ok: false, error: error.message };
    const removed = await supabase.from("meal_idea_items").delete().eq("idea_id", id);
    if (removed.error) return { ok: false, error: removed.error.message };
  } else {
    const last = await supabase
      .from("meal_ideas")
      .select("position")
      .eq("owner_id", user.id)
      .eq("meal", idea.meal)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const created = await supabase
      .from("meal_ideas")
      .insert({ ...idea, position: (last.data?.position ?? -1) + 1 })
      .select("id")
      .single();
    if (created.error) return { ok: false, error: created.error.message };
    ideaId = created.data.id as string;
  }
  const added = await supabase
    .from("meal_idea_items")
    .insert(items.map((it, position) => ({ ...it, idea_id: ideaId, position })));
  if (added.error) return { ok: false, error: added.error.message };
  refresh();
  return { ok: true, id: ideaId! };
}

export async function deleteIdea(id: string): Promise<ActionResult> {
  const { supabase } = await me();
  const { error } = await supabase.from("meal_ideas").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Turns what you logged for a meal on a day into an idea. */
export async function saveMealAsIdea(
  date: string,
  meal: Meal,
  name: string,
): Promise<Result<{ id: string }>> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const found = await supabase
    .from("meal_entries")
    .select("food_id, amount")
    .eq("owner_id", user.id)
    .eq("date", date)
    .eq("meal", meal)
    .not("food_id", "is", null)
    .order("created_at");
  if (found.error) return { ok: false, error: found.error.message };
  return saveIdea({
    meal,
    name,
    hint: null,
    note: null,
    items: found.data.map((e) => ({ food_id: e.food_id as string, amount: Number(e.amount) })),
  });
}
