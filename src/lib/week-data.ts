import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, type DateStr } from "@/lib/dates";
import { isMet } from "@/lib/habits";
import { volume } from "@/lib/workout";
import { weekStats, type WeekStats } from "@/lib/stats";
import type { HabitKind, Profile, WorkoutSet } from "@/lib/types";

function rows<T>(result: { data: unknown; error: { message: string } | null }, what: string): T[] {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return (result.data ?? []) as T[];
}

/** Someone's numbers for the week starting `monday`, counting days up to `today`. */
export async function getWeekStats(
  person: Profile,
  monday: DateStr,
  today: DateStr,
): Promise<WeekStats> {
  const supabase = await createClient();
  const sunday = addDays(monday, 6);
  const last = sunday < today ? sunday : today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d <= last);
  const id = person.id;

  const [plan, workouts, meals, water, habits, logs, weights] = await Promise.all([
    supabase.from("routine_schedule").select("weekday").eq("owner_id", id),
    supabase
      .from("workouts")
      .select(
        "date, workout_sets(exercise_id, reps, weight_kg, duration_s, distance_m, done, is_warmup)",
      )
      .eq("owner_id", id)
      .gte("date", monday)
      .lte("date", last)
      .not("ended_at", "is", null),
    supabase
      .from("meal_entries")
      .select("date, kcal, protein_g")
      .eq("owner_id", id)
      .gte("date", monday)
      .lte("date", last),
    supabase
      .from("water_logs")
      .select("date, ml")
      .eq("owner_id", id)
      .gte("date", monday)
      .lte("date", last),
    supabase.from("habits").select("id, kind, target").eq("owner_id", id).eq("active", true),
    supabase
      .from("habit_logs")
      .select("habit_id, date, value")
      .eq("owner_id", id)
      .gte("date", monday)
      .lte("date", last),
    supabase
      .from("body_metrics")
      .select("date, weight_kg")
      .eq("owner_id", id)
      .not("weight_kg", "is", null)
      .lte("date", last)
      .order("date")
      .limit(2000),
  ]);

  const food = new Map<DateStr, { kcal: number; protein_g: number }>();
  for (const m of rows<{ date: string; kcal: number; protein_g: number }>(meals, "meals")) {
    const f = food.get(m.date) ?? { kcal: 0, protein_g: 0 };
    food.set(m.date, {
      kcal: f.kcal + Number(m.kcal),
      protein_g: f.protein_g + Number(m.protein_g),
    });
  }
  const waterByDay = new Map<DateStr, number>();
  for (const w of rows<{ date: string; ml: number }>(water, "water")) {
    waterByDay.set(w.date, (waterByDay.get(w.date) ?? 0) + w.ml);
  }
  const habitList = rows<{ id: string; kind: HabitKind; target: number | null }>(habits, "habits");
  const habitDays = new Map<DateStr, { met: number; total: number }>();
  if (habitList.length) {
    for (const d of days) habitDays.set(d, { met: 0, total: habitList.length });
    for (const l of rows<{ habit_id: string; date: string; value: number }>(logs, "habit logs")) {
      const h = habitList.find((x) => x.id === l.habit_id);
      const day = habitDays.get(l.date);
      if (
        h &&
        day &&
        isMet({ kind: h.kind, target: h.target && Number(h.target) }, Number(l.value))
      )
        day.met++;
    }
  }

  return weekStats({
    days,
    plannedWeekdays: rows<{ weekday: number }>(plan, "plan").map((p) => p.weekday),
    workouts: rows<{ date: string; workout_sets: WorkoutSet[] }>(workouts, "workouts").map((w) => ({
      date: w.date,
      volume: volume(w.workout_sets),
    })),
    food,
    targets: person.target_kcal
      ? { kcal: person.target_kcal, protein_g: person.target_protein_g ?? 0 }
      : null,
    water: waterByDay,
    waterTarget: person.target_water_ml,
    habits: habitDays,
    weights: rows<{ date: string; weight_kg: number }>(weights, "weights").map((w) => ({
      date: w.date,
      kg: Number(w.weight_kg),
    })),
  });
}
