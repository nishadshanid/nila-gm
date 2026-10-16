import { addDays, daysBetween, startOfWeek, type DateStr } from "@/lib/dates";
import type { ExerciseKind, ScheduleDay, WorkoutSet } from "@/lib/types";

type SetValues = Pick<WorkoutSet, "reps" | "weight_kg" | "duration_s" | "distance_m">;
type LoggedSet = SetValues & Pick<WorkoutSet, "exercise_id" | "done" | "is_warmup">;

/** Estimated one-rep max (Epley). A single rep is its own max. */
export function e1rm(weightKg: number | null, reps: number | null): number {
  if (!weightKg || !reps || weightKg <= 0 || reps <= 0) return 0;
  const value = reps === 1 ? weightKg : weightKg * (1 + reps / 30);
  return Math.round(value * 10) / 10;
}

/** Sets that count: ticked off, and not warm-ups. */
export function isWorkingSet(s: Pick<WorkoutSet, "done" | "is_warmup">): boolean {
  return s.done && !s.is_warmup;
}

/** Total weight moved (Σ weight × reps) over the working sets, in kg. */
export function volume(sets: LoggedSet[]): number {
  let total = 0;
  for (const s of sets) {
    if (isWorkingSet(s) && s.weight_kg && s.reps) total += Number(s.weight_kg) * s.reps;
  }
  return Math.round(total);
}

/** The routine planned for an ISO weekday (1 = Monday), or null for a rest day. */
export function routineForDay(schedule: ScheduleDay[], weekday: number): string | null {
  return schedule.find((d) => d.weekday === weekday)?.routine_id ?? null;
}

export type Best = {
  maxWeight: number;
  bestE1rm: number;
  maxReps: number;
  maxDuration: number;
  maxDistance: number;
};

const EMPTY: Best = { maxWeight: 0, bestE1rm: 0, maxReps: 0, maxDuration: 0, maxDistance: 0 };

/** Each exercise's best numbers over the given working sets. */
export function bests(sets: LoggedSet[]): Map<string, Best> {
  const result = new Map<string, Best>();
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const b = { ...(result.get(s.exercise_id) ?? EMPTY) };
    const weight = Number(s.weight_kg ?? 0);
    b.maxWeight = Math.max(b.maxWeight, weight);
    b.bestE1rm = Math.max(b.bestE1rm, e1rm(weight, s.reps));
    // Reps only compare fairly without added weight (push-ups, pull-ups).
    if (!weight) b.maxReps = Math.max(b.maxReps, s.reps ?? 0);
    b.maxDuration = Math.max(b.maxDuration, s.duration_s ?? 0);
    b.maxDistance = Math.max(b.maxDistance, s.distance_m ?? 0);
    result.set(s.exercise_id, b);
  }
  return result;
}

export type PRKind = "weight" | "e1rm" | "reps" | "duration" | "distance";
export type PR = { exerciseId: string; kind: PRKind; value: number; previous: number };

const PR_ORDER: [PRKind, keyof Best][] = [
  ["weight", "maxWeight"],
  ["e1rm", "bestE1rm"],
  ["reps", "maxReps"],
  ["duration", "maxDuration"],
  ["distance", "maxDistance"],
];

/**
 * New personal records in `current` compared with everything before it: at most
 * one per exercise, the most meaningful one. The first time you do an exercise
 * sets a baseline, not a record.
 */
export function findPRs(current: LoggedSet[], before: LoggedSet[]): PR[] {
  const previous = bests(before);
  const prs: PR[] = [];
  for (const [exerciseId, now] of bests(current)) {
    const was = previous.get(exerciseId);
    if (!was) continue;
    for (const [kind, key] of PR_ORDER) {
      if (was[key] > 0 && now[key] > was[key]) {
        prs.push({ exerciseId, kind, value: now[key], previous: was[key] });
        break;
      }
    }
  }
  return prs;
}

/**
 * For each exercise, the sets from the most recent earlier workout that had it.
 * `rows` must be sorted newest workout first.
 */
export function lastTimeByExercise<T extends { exercise_id: string; workout_id: string }>(
  rows: T[],
): Map<string, T[]> {
  const workoutOf = new Map<string, string>();
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const chosen = workoutOf.get(row.exercise_id);
    if (chosen === undefined) workoutOf.set(row.exercise_id, row.workout_id);
    else if (chosen !== row.workout_id) continue;
    const list = result.get(row.exercise_id) ?? [];
    list.push(row);
    result.set(row.exercise_id, list);
  }
  return result;
}

/** 40 → "40", 42.5 → "42.5". */
export function formatKg(kg: number | string | null): string {
  if (kg === null || kg === "") return "";
  return String(Math.round(Number(kg) * 100) / 100);
}

/** Seconds as "m:ss" or "h:mm:ss". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Milliseconds as "45 min" or "1 h 5 min". */
export function formatMinutes(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${Math.floor(minutes / 60)} h`;
}

/** A set in a few characters: "40 kg × 10", "× 12", "20:00 · 3.2 km", "1:00". */
export function formatSet(s: SetValues, kind: ExerciseKind): string {
  if (kind === "strength") {
    if (s.reps == null) return "";
    return s.weight_kg ? `${formatKg(s.weight_kg)} kg × ${s.reps}` : `× ${s.reps}`;
  }
  const time = s.duration_s ? formatClock(s.duration_s) : "";
  if (kind === "time") return time;
  const km = s.distance_m ? `${Math.round(s.distance_m / 10) / 100} km` : "";
  return [time, km].filter(Boolean).join(" · ");
}

/** The same, short enough for a narrow column: "22.5×10", "×12", "20′ 2.5k", "1:00". */
export function formatSetShort(s: SetValues, kind: ExerciseKind): string {
  if (kind === "strength") {
    if (s.reps == null) return "";
    return `${s.weight_kg ? formatKg(s.weight_kg) : ""}×${s.reps}`;
  }
  if (kind === "time") return s.duration_s ? formatClock(s.duration_s) : "";
  const min = s.duration_s ? `${Math.round(s.duration_s / 60)}′` : "";
  const km = s.distance_m ? `${Math.round(s.distance_m / 100) / 10}k` : "";
  return [min, km].filter(Boolean).join(" ");
}

/** A routine's rep target: "8–12", "10", or "". */
export function repsLabel(min: number | null, max: number | null): string {
  if (min && max && max !== min) return `${min}–${max}`;
  return String(min ?? max ?? "");
}

const PR_LABEL: Record<PRKind, string> = {
  weight: "Heaviest",
  e1rm: "Best estimated 1RM",
  reps: "Most reps",
  duration: "Longest",
  distance: "Furthest",
};

/** "Heaviest: 60 kg (was 57.5)" and so on. */
export function describePR(pr: PR): string {
  const fmt = (v: number) =>
    pr.kind === "duration"
      ? formatClock(v)
      : pr.kind === "distance"
        ? `${Math.round(v / 10) / 100} km`
        : pr.kind === "reps"
          ? `${v} reps`
          : `${formatKg(v)} kg`;
  return `${PR_LABEL[pr.kind]}: ${fmt(pr.value)} (was ${fmt(pr.previous)})`;
}

/**
 * In a flexible programme (N a week, in order): the routine after the one you did
 * last, wrapping from the last day to the first. Day 1 if you haven't done any.
 * `routines` must be in programme order.
 */
export function nextRoutine<T extends { id: string }>(
  routines: T[],
  lastRoutineId: string | null,
): T | null {
  if (routines.length === 0) return null;
  const i = routines.findIndex((r) => r.id === lastRoutineId);
  return routines[i < 0 ? 0 : (i + 1) % routines.length];
}

export type WeekProgress = {
  done: number;
  goal: number;
  left: number;
  /** Days left in the week (Monday–Sunday), today included. */
  daysLeft: number;
  /** A rest day today still leaves enough days for the goal. */
  restOk: boolean;
};

/** Workouts this week against the goal. `dates` are finished workouts' dates. */
export function weekProgress(dates: DateStr[], goal: number, today: DateStr): WeekProgress {
  const monday = startOfWeek(today);
  const done = dates.filter((d) => d >= monday && d <= today).length;
  const left = Math.max(0, goal - done);
  const daysLeft = daysBetween(today, addDays(monday, 6)) + 1;
  return { done, goal, left, daysLeft, restOk: left < daysLeft };
}

/**
 * Time to add weight: last time, every working set reached the top of the rep
 * range (e.g. 12, 12, 12 on 8–12).
 */
export function readyToProgress(
  last: Pick<WorkoutSet, "reps">[] | undefined,
  repsMax: number | null,
): boolean {
  if (!last?.length || !repsMax) return false;
  return last.every((s) => (s.reps ?? 0) >= repsMax);
}
