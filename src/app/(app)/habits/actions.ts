"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STARTER_HABITS } from "@/lib/habits";

export type ActionResult = { ok: true } | { ok: false; error: string };

const signedOut = { ok: false as const, error: "You're signed out." };
const DATE = z.iso.date();

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function addWater(date: string, ml: number): Promise<ActionResult> {
  if (!DATE.safeParse(date).success || !Number.isInteger(ml) || ml < 1 || ml > 3000) {
    return { ok: false, error: "Invalid amount" };
  }
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } = await supabase.from("water_logs").insert({ date, ml });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Takes back the last glass logged that day. */
export async function undoWater(date: string): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const last = await supabase
    .from("water_logs")
    .select("id")
    .eq("owner_id", user.id)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last.error) return { ok: false, error: last.error.message };
  if (!last.data) return { ok: true };
  const { error } = await supabase.from("water_logs").delete().eq("id", last.data.id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

const waterSettingsSchema = z.object({
  glass_ml: z.number().int().min(50).max(1000),
  target_water_ml: z.number().int().min(500).max(10000),
});

export async function saveWaterSettings(
  input: z.input<typeof waterSettingsSchema>,
): Promise<ActionResult> {
  const parsed = waterSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Sets a habit's value for a day; null clears it. */
export async function setHabitValue(
  habitId: string,
  date: string,
  value: number | null,
): Promise<ActionResult> {
  if (!DATE.safeParse(date).success) return { ok: false, error: "Invalid date" };
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 99999999)) {
    return { ok: false, error: "Invalid value" };
  }
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } =
    value === null || value === 0
      ? await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("date", date)
      : await supabase.from("habit_logs").upsert({
          habit_id: habitId,
          date,
          value: Math.round(value * 10) / 10,
          updated_at: new Date().toISOString(),
        });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

const habitSchema = z
  .object({
    name: z.string().trim().min(1, "Give it a name").max(40),
    emoji: z
      .string()
      .trim()
      .max(16)
      .transform((v) => v || "✅"),
    kind: z.enum(["check", "number"]),
    target: z.number().positive("The target must be above 0").max(99999999).nullable(),
    unit: z
      .string()
      .trim()
      .max(12)
      .nullable()
      .transform((v) => v || null),
  })
  .refine((h) => h.kind === "check" || h.target !== null, {
    message: "Set a daily target",
    path: ["target"],
  })
  .transform((h) => (h.kind === "check" ? { ...h, target: null, unit: null } : h));
export type HabitInput = z.input<typeof habitSchema>;

/** Creates a habit (at the end of the list), or edits one when `id` is given. */
export async function saveHabit(input: HabitInput, id?: string): Promise<ActionResult> {
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { supabase, user } = await me();
  if (!user) return signedOut;
  if (id) {
    const { error } = await supabase.from("habits").update(parsed.data).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const last = await supabase
      .from("habits")
      .select("position")
      .eq("owner_id", user.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (last.data?.position ?? -1) + 1;
    const { error } = await supabase.from("habits").insert({ ...parsed.data, position });
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}

/** Deletes a habit and its history. */
export async function deleteHabit(id: string): Promise<ActionResult> {
  const { supabase } = await me();
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Swaps a habit with its neighbour above (-1) or below (+1). */
export async function moveHabit(id: string, by: -1 | 1): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const list = await supabase
    .from("habits")
    .select("id")
    .eq("owner_id", user.id)
    .eq("active", true)
    .order("position")
    .order("created_at");
  if (list.error) return { ok: false, error: list.error.message };
  const ids = list.data.map((h) => h.id as string);
  const i = ids.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(
    ids.map((hid, position) => supabase.from("habits").update({ position }).eq("id", hid)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  refresh();
  return { ok: true };
}

/** Steps, creatine, sleep, vitamins and no sugar, for a fresh start. */
export async function addStarterHabits(): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } = await supabase.from("habits").insert(STARTER_HABITS);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
