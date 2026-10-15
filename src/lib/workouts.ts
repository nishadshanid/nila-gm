import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { lastTimeByExercise } from "@/lib/workout";
import type { Exercise, RoutineWithExercises, ScheduleDay, Workout, WorkoutSet } from "@/lib/types";

function check<T>(result: { data: unknown; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
}

/** Built-in exercises plus both of your own, by name. Cached per request. */
export const getExercises = cache(async (): Promise<Exercise[]> => {
  const supabase = await createClient();
  return check<Exercise[]>(
    await supabase
      .from("exercises")
      .select("id, owner_id, name, muscle, equipment, kind")
      .order("name"),
    "exercises",
  );
});

/** Someone's routines, with their exercises in order. */
export async function getRoutines(ownerId: string): Promise<RoutineWithExercises[]> {
  const supabase = await createClient();
  const routines = check<RoutineWithExercises[]>(
    await supabase
      .from("routines")
      .select("*, routine_exercises(*)")
      .eq("owner_id", ownerId)
      .order("position")
      .order("created_at"),
    "routines",
  );
  for (const r of routines) r.routine_exercises.sort((a, b) => a.position - b.position);
  return routines;
}

export async function getRoutine(id: string): Promise<RoutineWithExercises | null> {
  const supabase = await createClient();
  const routine = check<RoutineWithExercises | null>(
    await supabase.from("routines").select("*, routine_exercises(*)").eq("id", id).maybeSingle(),
    "the routine",
  );
  routine?.routine_exercises.sort((a, b) => a.position - b.position);
  return routine;
}

export async function getSchedule(ownerId: string): Promise<ScheduleDay[]> {
  const supabase = await createClient();
  return check<ScheduleDay[]>(
    await supabase.from("routine_schedule").select("*").eq("owner_id", ownerId),
    "the weekly plan",
  );
}

/** The workout someone has in progress, if any. */
export async function getActiveWorkout(ownerId: string): Promise<Workout | null> {
  const supabase = await createClient();
  return check<Workout | null>(
    await supabase
      .from("workouts")
      .select("*")
      .eq("owner_id", ownerId)
      .is("ended_at", null)
      .maybeSingle(),
    "the current workout",
  );
}

export type WorkoutWithSets = Workout & { workout_sets: WorkoutSet[] };

export async function getWorkout(id: string): Promise<WorkoutWithSets | null> {
  const supabase = await createClient();
  const workout = check<WorkoutWithSets | null>(
    await supabase.from("workouts").select("*, workout_sets(*)").eq("id", id).maybeSingle(),
    "the workout",
  );
  workout?.workout_sets.sort((a, b) => a.position - b.position || a.set_no - b.set_no);
  return workout;
}

export type HistoryItem = WorkoutWithSets;

/** Someone's finished workouts, newest first. */
export async function getHistory(ownerId: string, limit = 20): Promise<HistoryItem[]> {
  const supabase = await createClient();
  return check<HistoryItem[]>(
    await supabase
      .from("workouts")
      .select("*, workout_sets(*)")
      .eq("owner_id", ownerId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(limit),
    "workout history",
  );
}

type SetRow = WorkoutSet & { workout: { owner_id: string; started_at: string; ended_at: string } };

/**
 * Finished sets of these exercises from workouts that started before `before`,
 * newest first. Feeds "last time" and personal records.
 */
export async function getEarlierSets(
  ownerId: string,
  exerciseIds: string[],
  before: string,
): Promise<SetRow[]> {
  if (exerciseIds.length === 0) return [];
  const supabase = await createClient();
  const rows = check<SetRow[]>(
    await supabase
      .from("workout_sets")
      .select("*, workout:workouts!inner(owner_id, started_at, ended_at)")
      .in("exercise_id", exerciseIds)
      .eq("done", true)
      .eq("workout.owner_id", ownerId)
      .not("workout.ended_at", "is", null)
      .lt("workout.started_at", before)
      .limit(2000),
    "earlier sets",
  );
  return rows.sort(
    (a, b) =>
      b.workout.started_at.localeCompare(a.workout.started_at) ||
      a.position - b.position ||
      a.set_no - b.set_no,
  );
}

/** For each exercise, the sets from the last time you did it. */
export async function getLastTime(ownerId: string, exerciseIds: string[], before: string) {
  return lastTimeByExercise(await getEarlierSets(ownerId, exerciseIds, before));
}
