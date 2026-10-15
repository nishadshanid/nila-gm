"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const signedOut = { ok: false as const, error: "You're signed out." };

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const cm = (min: number, max: number) =>
  z
    .number()
    .min(min, "Check the measurements")
    .max(max, "Check the measurements")
    .nullable()
    .transform((v) => (v === null ? null : Math.round(v * 10) / 10));

const metricsSchema = z.object({
  date: z.iso.date(),
  weight_kg: z
    .number()
    .min(20, "Check the weight")
    .max(400, "Check the weight")
    .nullable()
    .transform((v) => (v === null ? null : Math.round(v * 100) / 100)),
  body_fat_pct: cm(2, 70),
  waist_cm: cm(20, 300),
  chest_cm: cm(20, 300),
  arms_cm: cm(10, 100),
  hips_cm: cm(20, 300),
  thighs_cm: cm(10, 150),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .transform((v) => v || null),
});
export type MetricsInput = z.input<typeof metricsSchema>;

/** Saves a day's weigh-in and measurements. Clearing everything deletes the day. */
export async function saveMetrics(input: MetricsInput): Promise<ActionResult> {
  const parsed = metricsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { date, ...values } = parsed.data;
  const empty = Object.values(values).every((v) => v === null);
  const { error } = empty
    ? await supabase.from("body_metrics").delete().eq("owner_id", user.id).eq("date", date)
    : await supabase
        .from("body_metrics")
        .upsert({ owner_id: user.id, date, ...values }, { onConflict: "owner_id,date" });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteMetrics(date: string): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { error } = await supabase
    .from("body_metrics")
    .delete()
    .eq("owner_id", user.id)
    .eq("date", date);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

const photoSchema = z.object({
  path: z.string().max(200),
  date: z.iso.date(),
  pose: z.enum(["front", "side", "back"]),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
});

/** Records a photo the browser already uploaded to your folder in the bucket. */
export async function addPhoto(input: z.input<typeof photoSchema>): Promise<ActionResult> {
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid photo" };
  const { supabase, user } = await me();
  if (!user) return signedOut;
  if (!parsed.data.path.startsWith(`${user.id}/`)) return { ok: false, error: "Invalid photo" };
  const { error } = await supabase.from("progress_photos").insert(parsed.data);
  if (error) {
    await supabase.storage.from("progress").remove([parsed.data.path]);
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}

export async function deletePhoto(id: string): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const found = await supabase.from("progress_photos").select("path").eq("id", id).single();
  if (found.error) return { ok: false, error: found.error.message };
  const removed = await supabase.storage.from("progress").remove([found.data.path]);
  if (removed.error) return { ok: false, error: removed.error.message };
  const { error } = await supabase.from("progress_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
