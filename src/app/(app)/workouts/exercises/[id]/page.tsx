import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHousehold } from "@/lib/household";
import { relativeDay, toISTDate, todayIST } from "@/lib/dates";
import { equipmentLabel, focusLabel, swapsFor } from "@/lib/exercise-meta";
import { bests, e1rm, formatClock, formatKg, formatSet, isWorkingSet } from "@/lib/workout";
import { getEarlierSets, getExercises } from "@/lib/workouts";

export const metadata: Metadata = { title: "Exercise" };

async function ExerciseHistory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ me }, exercises] = await Promise.all([getHousehold(), getExercises()]);
  const exercise = exercises.find((e) => e.id === id);
  if (!exercise) notFound();

  // Everything you've logged for it ("before" a date far in the future).
  const sets = await getEarlierSets(me.id, [id], "9999-12-31");
  const best = bests(sets).get(id);
  const sessions = new Map<string, typeof sets>();
  for (const s of sets) sessions.set(s.workout_id, [...(sessions.get(s.workout_id) ?? []), s]);
  const today = todayIST();
  const swaps = swapsFor(exercise, exercises);

  const stats =
    exercise.kind === "strength"
      ? [
          ["Heaviest", best?.maxWeight ? `${formatKg(best.maxWeight)} kg` : "–"],
          ["Best est. 1RM", best?.bestE1rm ? `${formatKg(best.bestE1rm)} kg` : "–"],
          ["Sessions", String(sessions.size)],
        ]
      : [
          ["Longest", best?.maxDuration ? formatClock(best.maxDuration) : "–"],
          ["Furthest", best?.maxDistance ? `${Math.round(best.maxDistance / 10) / 100} km` : "–"],
          ["Sessions", String(sessions.size)],
        ];

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold">{exercise.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {focusLabel(exercise)} · {equipmentLabel(exercise.equipment)}
        </p>
      </div>
      <dl className="mb-6 grid grid-cols-3 gap-2 text-center">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="font-heading text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mb-2 text-sm font-semibold">History</h2>
      {sessions.size === 0 ? (
        <p className="text-muted-foreground text-sm">You haven&apos;t logged this yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {[...sessions.entries()].slice(0, 30).map(([workoutId, list]) => {
            const top = Math.max(
              0,
              ...list.filter(isWorkingSet).map((s) => e1rm(s.weight_kg, s.reps)),
            );
            return (
              <li key={workoutId}>
                <Link
                  href={`/workouts/${workoutId}`}
                  className="hover:bg-muted/50 block px-3 py-2.5"
                >
                  <p className="flex justify-between text-sm font-medium">
                    {relativeDay(toISTDate(list[0].workout.started_at), today)}
                    {top > 0 && (
                      <span className="text-muted-foreground text-xs font-normal">
                        est. 1RM {formatKg(top)} kg
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {list
                      .filter((s) => !s.is_warmup)
                      .map((s) => formatSet(s, exercise.kind))
                      .join(" · ")}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {swaps.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Works the same</h2>
          <ul className="divide-y rounded-xl border">
            {swaps.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/workouts/exercises/${e.id}`}
                  className="hover:bg-muted/50 flex flex-col px-3 py-2.5"
                >
                  <span className="font-medium">{e.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {focusLabel(e)} · {equipmentLabel(e.equipment)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function ExercisePage({ params }: PageProps<"/workouts/exercises/[id]">) {
  return (
    <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
      <ExerciseHistory params={params} />
    </Suspense>
  );
}
