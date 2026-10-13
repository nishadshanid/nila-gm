import { timingSafeEqual } from "node:crypto";
import { clean } from "@/lib/clean-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { runTick } from "@/lib/tick";

// Supabase pg_cron calls this every 15 minutes (see the foundation migration).
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = clean(process.env.CRON_SECRET);
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runTick(createAdminClient());
    if (result.errors.length) console.error("[cron] tick errors", result.errors);
    return Response.json(result);
  } catch (e) {
    console.error("[cron] tick failed", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
