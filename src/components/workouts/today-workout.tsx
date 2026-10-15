import Link from "next/link";
import { Dumbbell, Moon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartWorkoutButton } from "@/components/workouts/start-workout-button";
import { formatClock, routineForDay } from "@/lib/workout";
import { isoWeekday } from "@/lib/dates";
import type { RoutineWithExercises, ScheduleDay, Workout } from "@/lib/types";

/** Today's planned workout with a Start button, or Resume when one is in progress. */
export function TodayWorkout({
  today,
  now,
  active,
  routines,
  schedule,
  doneToday,
}: {
  today: string;
  now: number;
  active: Workout | null;
  routines: RoutineWithExercises[];
  schedule: ScheduleDay[];
  /** Workouts already finished today. */
  doneToday: Workout[];
}) {
  if (active) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-600/40 bg-green-600/10 p-4">
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

  const planned = routines.find((r) => r.id === routineForDay(schedule, isoWeekday(today)));
  if (doneToday.length > 0) {
    const last = doneToday[0];
    return (
      <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
        <span className="text-2xl">💪</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{last.name} done today</p>
          <Link href={`/workouts/${last.id}`} className="text-muted-foreground text-sm underline">
            See the summary
          </Link>
        </div>
        <StartWorkoutButton routineId={null} label="Another" variant="outline" size="sm" />
      </div>
    );
  }

  if (planned) {
    return (
      <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
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
    <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
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
