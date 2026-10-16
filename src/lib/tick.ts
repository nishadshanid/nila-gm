import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isoWeekday, startOfWeek, todayIST, TZ } from "@/lib/dates";
import { nextRoutine, weekProgress } from "@/lib/workout";
import { sendPush } from "@/lib/push";
import { dueReminders, type ReminderSettings } from "@/lib/reminders";

export type TickResult = { sent: number; errors: string[] };

type ProfileRow = ReminderSettings & {
  id: string;
  push_notifications: boolean;
  target_water_ml: number;
  weekly_goal: number | null;
  next_routine_id: string | null;
};

/** India time as minutes after midnight. */
function minutesIST(now: Date): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  })
    .format(now)
    .split(":")
    .map(Number);
  return h * 60 + m;
}

function rows<T>(result: { data: unknown; error: { message: string } | null }, what: string): T[] {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return (result.data ?? []) as T[];
}

/**
 * Runs every 15 minutes (pg_cron → /api/cron/tick): sends the workout, water,
 * meal and weigh-in reminders that are due. The notification log makes sure
 * each one goes out once, however often the tick runs. The regular calls also
 * keep the free Supabase project awake.
 */
export async function runTick(db: SupabaseClient, now = new Date()): Promise<TickResult> {
  const date = todayIST(now);
  const weekday = isoWeekday(date);
  const minutes = minutesIST(now);
  const errors: string[] = [];

  const [profiles, planned, workouts, water, meals, weights, routines, recent] = await Promise.all([
    db
      .from("profiles")
      .select("*")
      .then((r) => rows<ProfileRow>(r, "profiles")),
    db
      .from("routine_schedule")
      .select("owner_id, routine:routines(name)")
      .eq("weekday", weekday)
      .then((r) => rows<{ owner_id: string; routine: { name: string } | null }>(r, "plan")),
    db
      .from("workouts")
      .select("owner_id")
      .eq("date", date)
      .then((r) => rows<{ owner_id: string }>(r, "workouts")),
    db
      .from("water_logs")
      .select("owner_id, ml")
      .eq("date", date)
      .then((r) => rows<{ owner_id: string; ml: number }>(r, "water")),
    db
      .from("meal_entries")
      .select("owner_id, meal")
      .eq("date", date)
      .then((r) => rows<{ owner_id: string; meal: string }>(r, "meals")),
    db
      .from("body_metrics")
      .select("owner_id")
      .eq("date", date)
      .not("weight_kg", "is", null)
      .then((r) => rows<{ owner_id: string }>(r, "weigh-ins")),
    db
      .from("routines")
      .select("id, owner_id, name")
      .order("position")
      .order("created_at")
      .then((r) => rows<{ id: string; owner_id: string; name: string }>(r, "routines")),
    // Finished workouts, newest first: this week's count and the last routine done.
    db
      .from("workouts")
      .select("owner_id, date, routine_id")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(100)
      .then((r) =>
        rows<{ owner_id: string; date: string; routine_id: string | null }>(r, "recent workouts"),
      ),
  ]);
  const monday = startOfWeek(date);

  let sent = 0;
  for (const p of profiles) {
    if (!p.push_notifications) continue;
    let flexible = null;
    if (p.weekly_goal) {
      const mine = recent.filter((w) => w.owner_id === p.id);
      const own = routines.filter((r) => r.owner_id === p.id);
      const next = nextRoutine(
        own,
        mine.find((w) => w.routine_id)?.routine_id ?? null,
        p.next_routine_id,
      );
      const week = weekProgress(
        mine.filter((w) => w.date >= monday).map((w) => w.date),
        p.weekly_goal,
        date,
      );
      flexible = {
        next: next?.name ?? "Your next workout",
        left: week.left,
        daysLeft: week.daysLeft,
      };
    }
    const due = dueReminders(
      p,
      {
        weekday,
        flexible,
        plannedRoutine: planned.find((x) => x.owner_id === p.id)?.routine?.name ?? null,
        trained: workouts.some((w) => w.owner_id === p.id),
        waterMl: water.filter((w) => w.owner_id === p.id).reduce((t, w) => t + w.ml, 0),
        waterTarget: p.target_water_ml,
        mealsLogged: new Set(meals.filter((m) => m.owner_id === p.id).map((m) => m.meal)).size,
        weighedIn: weights.some((w) => w.owner_id === p.id),
      },
      date,
      minutes,
    );
    for (const r of due) {
      // Claim it first; a duplicate key means it already went out.
      const claim = await db
        .from("notification_log")
        .insert({ kind: r.kind, key: r.key, user_id: p.id });
      if (claim.error) {
        if (claim.error.code !== "23505") errors.push(`log ${r.kind}: ${claim.error.message}`);
        continue;
      }
      try {
        await sendPush(db, p.id, {
          title: "Nila Gym",
          body: r.body,
          path: r.path,
          tag: `reminder:${r.kind}`,
        });
        sent++;
      } catch (e) {
        errors.push(`push ${r.kind}: ${(e as Error).message}`);
      }
    }
  }
  return { sent, errors };
}
