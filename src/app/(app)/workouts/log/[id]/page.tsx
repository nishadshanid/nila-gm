import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getHousehold } from "@/lib/household";
import { getExercises, getLastTime, getRoutine, getWorkout } from "@/lib/workouts";
import { Logger } from "./logger";

export const metadata: Metadata = { title: "Workout" };

async function Live({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ me }, workout] = await Promise.all([getHousehold(), getWorkout(id)]);
  if (!workout || workout.owner_id !== me.id) notFound();
  if (workout.ended_at) redirect(`/workouts/${id}`);

  const exerciseIds = [...new Set(workout.workout_sets.map((s) => s.exercise_id))];
  const [exercises, lastTime, routine] = await Promise.all([
    getExercises(),
    getLastTime(me.id, exerciseIds, workout.started_at),
    workout.routine_id ? getRoutine(workout.routine_id) : null,
  ]);
  const targets = Object.fromEntries(
    (routine?.routine_exercises ?? []).map((e) => [
      e.exercise_id,
      { reps_min: e.reps_min, reps_max: e.reps_max, notes: e.notes },
    ]),
  );
  const previous = Object.fromEntries(
    [...lastTime].map(([exerciseId, sets]) => [
      exerciseId,
      sets
        .filter((s) => !s.is_warmup)
        .map(({ set_no, reps, weight_kg, duration_s, distance_m }) => ({
          set_no,
          reps,
          weight_kg,
          duration_s,
          distance_m,
        })),
    ]),
  );

  return (
    <Logger
      workout={{ id: workout.id, name: workout.name, started_at: workout.started_at }}
      initialSets={workout.workout_sets}
      exercises={exercises}
      lastTime={previous}
      targets={targets}
      routineNotes={routine?.notes ?? null}
    />
  );
}

export default function LogPage({ params }: PageProps<"/workouts/log/[id]">) {
  return (
    <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
      <Live params={params} />
    </Suspense>
  );
}
