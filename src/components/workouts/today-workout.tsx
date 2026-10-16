import Link from "next/link";
import { CircleCheck, Dumbbell, Moon, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartWorkoutButton } from "@/components/workouts/start-workout-button";
import { ChangeNext } from "@/components/workouts/change-next";
import { formatClock, routineForDay } from "@/lib/workout";
import { isoWeekday } from "@/lib/dates";
import type { RoutineWithExercises, ScheduleDay, Workout } from "@/lib/types";
import type { Programme } from "@/lib/workouts";

export type PartnerNext = { name: string; routine: string; slot: number } | null;

/**
 * Today's workout: Resume when one is in progress, "done today", or what's up
 * next (the next Day in a flexible programme, or today's routine in a weekday
 * plan) with a Start button. A flexible programme also shows your partner's next.
 */
export function TodayWorkout({
  today,
  now,
  active,
  routines,
  schedule,
  doneToday,
  flexible = null,
  partner = null,
}: {
  today: string;
  now: number;
  active: Workout | null;
  routines: RoutineWithExercises[];
  schedule: ScheduleDay[];
  /** Workouts already finished today. */
  doneToday: Workout[];
  flexible?: Programme["flexible"];
  partner?: PartnerNext;
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <Main
        today={today}
        now={now}
        active={active}
        routines={routines}
        schedule={schedule}
        doneToday={doneToday}
        flexible={flexible}
      />
      {flexible && partner && (
        <p className="text-muted-foreground flex items-center gap-2 border-t px-4 py-2 text-sm">
          <Users className="size-4 shrink-0" />
          <span className="min-w-0">
            {!active && !doneToday.length && partner.slot === flexible.slot ? (
              <>
                {partner.name}&apos;s next is {partner.routine}, the same area.{" "}
                <span className="text-foreground font-medium">Train together.</span>
              </>
            ) : (
              <>
                {partner.name}&apos;s next: {partner.routine}
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}

function Main({
  today,
  now,
  active,
  routines,
  schedule,
  doneToday,
  flexible,
}: {
  today: string;
  now: number;
  active: Workout | null;
  routines: RoutineWithExercises[];
  schedule: ScheduleDay[];
  doneToday: Workout[];
  flexible: Programme["flexible"];
}) {
  const week = flexible?.week;
  const weekLine = week ? `${week.done} of ${week.goal} this week` : null;

  if (active) {
    return (
      <div className="flex items-center gap-3 bg-green-600/10 p-4">
        <Dumbbell className="size-6 shrink-0 text-green-700 dark:text-green-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{active.name} in progress</p>
          <p className="text-muted-foreground text-sm tabular-nums">
            Started {formatClock((now - new Date(active.started_at).getTime()) / 1000)} ago
          </p>
        </div>
        <Button nativeButton={false} render={<Link href={`/workouts/log/${active.id}`} />}>
          <Play /> Resume
        </Button>
      </div>
    );
  }

  if (doneToday.length > 0) {
    const last = doneToday[0];
    return (
      <div className="flex items-center gap-3 p-4">
        <CircleCheck className="size-6 shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{last.name} done today</p>
          <p className="text-muted-foreground text-sm">
            <Link href={`/workouts/${last.id}`} className="underline">
              See the summary
            </Link>
            {weekLine && ` · ${weekLine}`}
          </p>
        </div>
        <StartWorkoutButton routineId={null} label="Another" variant="outline" size="sm" />
      </div>
    );
  }

  if (flexible?.next) {
    const next = flexible.next;
    return (
      <div className="flex items-center gap-3 p-4">
        <Dumbbell className="size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">
            Up next · {weekLine}
            {week && week.left === 0 && ", goal reached"}
          </p>
          <p className="font-semibold">{next.name}</p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
            {next.routine_exercises.length} exercises
            <ChangeNext routines={routines.map(({ id, name }) => ({ id, name }))} />
          </p>
        </div>
        <StartWorkoutButton routineId={next.id} />
      </div>
    );
  }

  const planned = flexible
    ? undefined
    : routines.find((r) => r.id === routineForDay(schedule, isoWeekday(today)));
  if (planned) {
    return (
      <div className="flex items-center gap-3 p-4">
        <Dumbbell className="size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">Today: {planned.name}</p>
          <p className="text-muted-foreground text-sm">
            {planned.routine_exercises.length} exercise
            {planned.routine_exercises.length === 1 ? "" : "s"}
          </p>
        </div>
        <StartWorkoutButton routineId={planned.id} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <Moon className="text-muted-foreground size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Rest day</p>
        <p className="text-muted-foreground text-sm">
          {routines.length ? "Nothing planned. Train anyway?" : "Make a routine to get started."}
        </p>
      </div>
      <StartWorkoutButton routineId={null} label="Empty workout" variant="outline" size="sm" />
    </div>
  );
}
