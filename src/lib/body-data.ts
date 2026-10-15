import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BodyMetric, ProgressPhoto } from "@/lib/types";

const NUMERIC = [
  "weight_kg",
  "body_fat_pct",
  "waist_cm",
  "chest_cm",
  "arms_cm",
  "hips_cm",
  "thighs_cm",
] as const;

/** Someone's weigh-ins and measurements, oldest first. */
export async function getBodyMetrics(ownerId: string): Promise<BodyMetric[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_metrics")
    .select("id, owner_id, date, notes, " + NUMERIC.join(", "))
    .eq("owner_id", ownerId)
    .order("date")
    .limit(2000);
  if (error) throw new Error(`Could not load body metrics: ${error.message}`);
  return (data as unknown as BodyMetric[]).map((m) => {
    const row = { ...m };
    for (const k of NUMERIC) row[k] = m[k] === null ? null : Number(m[k]);
    return row;
  });
}

/** The latest weight on record, for prefilling forms. */
export async function getLatestWeight(ownerId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_metrics")
    .select("weight_kg")
    .eq("owner_id", ownerId)
    .not("weight_kg", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.weight_kg) : null;
}

export type PhotoWithUrl = ProgressPhoto & { url: string };

/** Your progress photos, newest first, with short-lived links to show them. */
export async function getPhotos(ownerId: string): Promise<PhotoWithUrl[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_photos")
    .select("id, date, pose, path, width, height")
    .eq("owner_id", ownerId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load photos: ${error.message}`);
  const photos = data as ProgressPhoto[];
  if (photos.length === 0) return [];
  const signed = await supabase.storage.from("progress").createSignedUrls(
    photos.map((p) => p.path),
    60 * 60,
  );
  if (signed.error) throw new Error(`Could not load photos: ${signed.error.message}`);
  const urls = new Map(signed.data.map((s) => [s.path, s.signedUrl]));
  return photos.flatMap((p) => {
    const url = urls.get(p.path);
    return url ? [{ ...p, url }] : [];
  });
}
