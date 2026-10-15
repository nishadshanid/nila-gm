"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notifyPartner } from "@/lib/notify-partner";
import { findPRs, formatMinutes } from "@/lib/workout";
import type { Exercise } from "@/lib/types";
import {
  exerciseInputSchema,
  routineInputSchema,
  setValuesSchema,
  type ExerciseInput,
  type RoutineInput,
  type SetValuesInput,
} from "@/lib/workout-schema";

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

/** Creates a routine, or replaces it (and its exercise list) when `id` is given. */
export async function saveRoutine(
  input: RoutineInput,
  id?: string,
): Promise<Result<{ id: string }>> {
  const parsed = routineInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid routine" };
  }
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { exercises, ...routine } = parsed.data;

  const saved = id
    ? await supabase.from("routines").update(routine).eq("id", id).select("id").single()
    : await supabase.from("routines").insert(routine).select("id").single();
  if (saved.error) return { ok: false, error: saved.error.message };
  const routineId = saved.data.id as string;

  const removed = await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
  if (removed.error) return { ok: false, error: removed.error.message };
  const added = await supabase
    .from("routine_exercises")
    .insert(exercises.map((e, position) => ({ ...e, routine_id: routineId, position })));
  if (added.error) return { ok: false, error: added.error.message };

  refresh();
  return { ok: true, id: routineId };
}

export async function deleteRoutine(id: string): Promise<ActionResult> {
  const { supabase } = await me();
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** The weekly plan: a routine per weekday (1 = Monday), or null for rest. */
export async function saveSchedule(days: (string | null)[]): Promise<ActionResult> {
  if (days.length !== 7) return { ok: false, error: "Invalid plan" };
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const removed = await supabase.from("routine_schedule").delete().eq("owner_id", user.id);
  if (removed.error) return { ok: false, error: removed.error.message };
  const rows = days.flatMap((routine_id, i) =>
    routine_id ? [{ weekday: i + 1, routine_id }] : [],
  );
  if (rows.length) {
    const { error } = await supabase.from("routine_schedule").insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}

export async function createExercise(
  input: ExerciseInput,
): Promise<Result<{ exercise: Exercise }>> {
  const parsed = exerciseInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid exercise" };
  }
  const { supabase, user } = await me();
  if (!user) return signedOut;
  const { data, error } = await supabase
    .from("exercises")
    .insert(parsed.data)
    .select("id, owner_id, name, muscle, equipment, kind")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, exercise: data as Exercise };
}

/**
 * Starts a workout from a routine (or an empty one), with a row for every
 * planned set. If one is already in progress, returns that instead.
 */
export async function startWorkout(routineId: string | null): Promise<Result<{ id: string }>> {
  const { supabase, user } = await me();
  if (!user) return signedOut;

  const active = await supabase
    .from("workouts")
    .select("id")
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .maybeSingle();
  if (active.data) return { ok: true, id: active.data.id as string };

  let name = "Workout";
  let plan: { exercise_id: string; sets: number; rest_s: number }[] = [];
  if (routineId) {
    const routine = await supabase
      .from("routines")
      .select("name, routine_exercises(exercise_id, position, sets, rest_s)")
      .eq("id", routineId)
      .single();
    if (routine.error) return { ok: false, error: routine.error.message };
    name = routine.data.name;
    plan = [...routine.data.routine_exercises].sort((a, b) => a.position - b.position);
  }

  const created = await supabase
    .from("workouts")
    .insert({ routine_id: routineId, name })
    .select("id")
    .single();
  if (created.error) return { ok: false, error: created.error.message };
  const workoutId = created.data.id as string;

  const sets = plan.flatMap((e, position) =>
    Array.from({ length: e.sets }, (_, i) => ({
      workout_id: workoutId,
      exercise_id: e.exercise_id,
      position,
      set_no: i + 1,
      rest_s: e.rest_s,
    })),
  );
  if (sets.length) {
    const { error } = await supabase.from("workout_sets").insert(sets);
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, id: workoutId };
}

/** Saves a set's numbers and whether it's done. No page refresh: the logger keeps its own state. */
export async function updateSet(id: string, values: SetValuesInput): Promise<ActionResult> {
  const parsed = setValuesSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid set" };
  }
  const { supabase } = await me();
  const { error } = await supabase
    .from("workout_sets")
    .update({ ...parsed.data, done_at: parsed.data.done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Adds a set (or the first sets of a new exercise) and returns the new rows. */
export async function addSets(
  workoutId: string,
  exerciseId: string,
  position: number,
  fromSetNo: number,
  count: number,
  restS: number,
): Promise<Result<{ sets: Record<string, unknown>[] }>> {
  const { supabase } = await me();
  const { data, error } = await supabase
    .from("workout_sets")
    .insert(
      Array.from({ length: Math.min(Math.max(count, 1), 10) }, (_, i) => ({
        workout_id: workoutId,
        exercise_id: exerciseId,
        position,
        set_no: fromSetNo + i,
        rest_s: Math.min(Math.max(restS, 0), 900),
      })),
    )
    .select("*");
  if (error) return { ok: false, error: error.message };
  return { ok: true, sets: data };
}

export async function removeSets(ids: string[]): Promise<ActionResult> {
  if (ids.length === 0) return { ok: true };
  const { supabase } = await me();
  const { error } = await supabase.from("workout_sets").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Ends the workout. Sets that were never ticked off are dropped. */
export async function finishWorkout(
  id: string,
  notes: string,
  feeling: number | null,
): Promise<ActionResult> {
  const { supabase } = await me();
  const dropped = await supabase
    .from("workout_sets")
    .delete()
    .eq("workout_id", id)
    .eq("done", false);
  if (dropped.error) return { ok: false, error: dropped.error.message };
  const { data: workout, error } = await supabase
    .from("workouts")
    .update({
      ended_at: new Date().toISOString(),
      notes: notes.trim().slice(0, 1000) || null,
      feeling: feeling && feeling >= 1 && feeling <= 5 ? feeling : null,
    })
    .eq("id", id)
    .select("owner_id, name, started_at, ended_at")
    .single();
  if (error) return { ok: false, error: error.message };
  notifyPartner(
    workout.owner_id,
    (who, db) => describeFinish(db, id, workout, who),
    "notify_partner_workouts",
  );
  refresh();
  return { ok: true };
}

/** "Nishad finished Leg day: 52 min, 18 sets, 2 new records." */
async function describeFinish(
  db: SupabaseClient,
  id: string,
  w: { owner_id: string; name: string; started_at: string; ended_at: string },
  who: string,
) {
  const sets = await db
    .from("workout_sets")
    .select("exercise_id, reps, weight_kg, duration_s, distance_m, done, is_warmup")
    .eq("workout_id", id);
  const current = (sets.data ?? []) as Parameters<typeof findPRs>[0];
  const ids = [...new Set(current.map((s) => s.exercise_id))];
  const earlier = ids.length
    ? await db
        .from("workout_sets")
        .select(
          "exercise_id, reps, weight_kg, duration_s, distance_m, done, is_warmup, workout:workouts!inner(owner_id, started_at, ended_at)",
        )
        .in("exercise_id", ids)
        .eq("done", true)
        .eq("workout.owner_id", w.owner_id)
        .not("workout.ended_at", "is", null)
        .lt("workout.started_at", w.started_at)
        .limit(2000)
    : { data: [] };
  const prs = findPRs(current, (earlier.data ?? []) as Parameters<typeof findPRs>[1]).length;
  const working = current.filter((s) => s.done && !s.is_warmup).length;
  const parts = [
    formatMinutes(new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()),
    `${working} set${working === 1 ? "" : "s"}`,
    prs ? `${prs} new record${prs === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return {
    body: `${who} finished ${w.name}: ${parts.join(", ")}.`,
    path: `/workouts/${id}`,
    tag: `workout:${id}`,
  };
}

/** Throws away a workout (in progress or from history). */
export async function deleteWorkout(id: string): Promise<ActionResult> {
  const { supabase } = await me();
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
