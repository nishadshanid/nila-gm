import "server-only";
import { createClient } from "@supabase/supabase-js";
import { clean } from "@/lib/clean-env";
import { SUPABASE_URL } from "@/lib/env";

/** Service-role client that bypasses RLS. Server-only: cron jobs and trusted jobs. */
export function createAdminClient() {
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) throw new Error("Missing environment variable SUPABASE_SERVICE_ROLE_KEY");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
