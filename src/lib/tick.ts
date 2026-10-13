import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TickResult = { sent: number; errors: string[] };

/**
 * Runs every 15 minutes (pg_cron → /api/cron/tick). Reminders arrive in phase 5;
 * for now it just touches the database, which also keeps the free project awake.
 */
export async function runTick(db: SupabaseClient): Promise<TickResult> {
  const { error } = await db.from("profiles").select("id", { head: true, count: "exact" });
  return { sent: 0, errors: error ? [error.message] : [] };
}
