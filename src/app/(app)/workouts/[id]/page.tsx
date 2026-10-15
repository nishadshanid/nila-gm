import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getHousehold } from "@/lib/household";
import { formatDay } from "@/lib/dates";
import {
  describePR,
  e1rm,
  findPRs,
  formatKg,
  formatMinutes,
  formatSet,
  isWorkingSet,
  volume,
} from "@/lib/workout";
import { getEarlierSets, getExercises, getWorkout } from "@/lib/workouts";
import { PersonDot } from "@/components/person-dot";
import { Celebrate, DeleteWorkoutButton } from "./summary-actions";

export const metadata: Metadata = { title: "Workout" };

const FEELINGS = ["Tough", "Meh", "OK", "Good", "Great"];

async function Summary({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [{ me, people }, workout, exercises] = await Promise.all([
    getHousehold(),
    getWorkout(id),
    getExercises(),
  ]);
  if (!workout) notFound();
  if (!workout.ended_at) {
    if (workout.owner_id === me.id) redirect(`/workouts/log/${id}`);
    notFound();
  }

  const sets = workout.workout_sets;
  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
  const before = await getEarlierSets(workout.owner_id, exerciseIds, workout.started_at);
  const prs = findPRs(sets, before);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const owner = people.find((p) => p.id === workout.owner_id);
  const mine = workout.owner_id === me.id;

  const blocks = new Map<number, typeof sets>();
  for (const s of sets) blocks.set(s.position, [...(blocks.get(s.position) ?? []), s]);
  const working = sets.filter(isWorkingSet).length;
  const kg = volume(sets);
  const duration = new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime();

  return (
    <>
      {mine && query.done && <Celebrate records={prs.length} />}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold">{workout.name}</h1>
        <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 text-sm">
          {!mine && owner && (
            <>
              <PersonDot profile={owner} /> {owner.name} ·
            </>
          )}
          {formatDay(workout.date, "EEEE d MMMM")}
          {workout.feeling && (
            <span aria-label={`Felt ${workout.feeling} of 5`}>
              {" "}
              · Felt {FEELINGS[workout.feeling - 1].toLowerCase()}
            </span>
          )}
        </p>
      </div>

      <dl className="mb-6 grid grid-cols-3 gap-2 text-center">
        {[
          ["Time", formatMinutes(duration)],
          ["Sets", String(working)],
          ["Volume", kg ? `${kg.toLocaleString("en-IN")} kg` : "–"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="font-heading text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {prs.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Trophy className="size-5" /> {prs.length} new personal record
            {prs.length === 1 ? "" : "s"}!
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {prs.map((pr) => (
              <li key={pr.exerciseId}>
                <span className="font-medium">{byId.get(pr.exerciseId)?.name}</span> ·{" "}
                {describePR(pr)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 flex flex-col gap-3">
        {[...blocks.entries()]
          .sort(([a], [b]) => a - b)
          .map(([position, list]) => {
            const exercise = byId.get(list[0].exercise_id);
            const kind = exercise?.kind ?? "strength";
            const best = Math.max(
              0,
              ...list.filter(isWorkingSet).map((s) => e1rm(s.weight_kg, s.reps)),
            );
            let n = 0;
            return (
              <section key={position} className="bg-card rounded-xl border p-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Link
                    href={`/workouts/exercises/${list[0].exercise_id}`}
                    className="truncate font-semibold hover:underline"
                  >
                    {exercise?.name ?? "Exercise"}
                  </Link>
                  {best > 0 && (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      est. 1RM {formatKg(best)} kg
                    </span>
                  )}
                </div>
                <ol className="text-sm tabular-nums">
                  {list.map((s) => (
                    <li key={s.id} className="flex gap-3 py-0.5">
                      <span
                        className={s.is_warmup ? "w-5 text-amber-600" : "text-muted-foreground w-5"}
                      >
                        {s.is_warmup ? "W" : ++n}
                      </span>
                      <span>{formatSet(s, kind)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
      </div>

      {workout.notes && (
        <p className="bg-muted mb-6 rounded-xl p-3 text-sm whitespace-pre-wrap">{workout.notes}</p>
      )}
      {mine && <DeleteWorkoutButton id={workout.id} />}
    </>
  );
}

export default function WorkoutPage({ params, searchParams }: PageProps<"/workouts/[id]">) {
  return (
    <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
      <Summary params={params} searchParams={searchParams} />
    </Suspense>
  );
}
