import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StartWorkoutButton } from "@/components/workouts/start-workout-button";
import { TodayWorkout } from "@/components/workouts/today-workout";
import { getHousehold } from "@/lib/household";
import { isoWeekday, relativeDay, todayIST } from "@/lib/dates";
import { muscleLabel } from "@/lib/exercise-meta";
import { formatMinutes, volume } from "@/lib/workout";
import { getExercises, getProgramme, partnerNext } from "@/lib/workouts";
import { WeekPlan } from "./week-plan";

export const metadata: Metadata = { title: "Workouts" };

async function Workouts() {
  await connection();
  const now = new Date();
  const today = todayIST(now);
  const { me, partner } = await getHousehold();
  const [programme, theirs, exercises] = await Promise.all([
    getProgramme(me, today),
    partner?.weekly_goal ? getProgramme(partner, today) : null,
    getExercises(),
  ]);
  const { routines, schedule, active, history, flexible } = programme;
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const plan = Array.from(
    { length: 7 },
    (_, i) => schedule.find((d) => d.weekday === i + 1)?.routine_id ?? null,
  );

  return (
    <>
      <div className="mb-6">
        <TodayWorkout
          today={today}
          now={now.getTime()}
          active={active}
          routines={routines}
          schedule={schedule}
          doneToday={history.filter((w) => w.date === today)}
          flexible={flexible}
          partner={partnerNext(partner, theirs)}
        />
      </div>

      <WeekPlan
        routines={routines.map(({ id, name }) => ({ id, name }))}
        plan={plan}
        todayWeekday={isoWeekday(today)}
        goal={me.weekly_goal}
        week={flexible?.week ?? null}
      />

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Routines</h2>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/workouts/routines/new" />}
          >
            <Plus /> New routine
          </Button>
        </div>
        {routines.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            A routine is a list of exercises you do together, like &quot;Push day&quot; or
            &quot;Legs&quot;.{" "}
            <Link href="/workouts/routines/new" className="underline">
              Make your first one
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {routines.map((r) => {
              const muscles = [
                ...new Set(
                  r.routine_exercises.flatMap((e) => {
                    const ex = exerciseById.get(e.exercise_id);
                    return ex ? [muscleLabel(ex.muscle)] : [];
                  }),
                ),
              ];
              return (
                <li key={r.id} className="bg-card flex items-center gap-2 rounded-xl border p-3">
                  <Link href={`/workouts/routines/${r.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {r.routine_exercises.length} exercises
                      {muscles.length > 0 && ` · ${muscles.slice(0, 4).join(", ")}`}
                    </p>
                  </Link>
                  <StartWorkoutButton
                    routineId={r.id}
                    variant="outline"
                    size="sm"
                    disabled={active !== null}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">Finished workouts show up here.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {history.map((w) => {
              const sets = w.workout_sets.filter((s) => s.done && !s.is_warmup).length;
              const kg = volume(w.workout_sets);
              const ms = new Date(w.ended_at!).getTime() - new Date(w.started_at).getTime();
              return (
                <li key={w.id}>
                  <Link
                    href={`/workouts/${w.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{w.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {relativeDay(w.date, today)} · {formatMinutes(ms)} · {sets} sets
                        {kg > 0 && ` · ${kg.toLocaleString("en-IN")} kg`}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground size-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

export default function WorkoutsPage() {
  return (
    <>
      <PageHeader title="Workouts" />
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Workouts />
      </Suspense>
    </>
  );
}
