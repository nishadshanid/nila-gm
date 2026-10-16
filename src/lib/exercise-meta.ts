import type { Equipment, Exercise, ExerciseKind, Muscle } from "@/lib/types";

export const MUSCLES: { value: Muscle; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "forearms", label: "Forearms" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "glutes", label: "Glutes" },
  { value: "calves", label: "Calves" },
  { value: "core", label: "Core" },
  { value: "cardio", label: "Cardio" },
  { value: "full_body", label: "Full body" },
];

export const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "machine", label: "Machine" },
  { value: "cable", label: "Cable" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "band", label: "Band" },
  { value: "other", label: "Other" },
];

export const KINDS: { value: ExerciseKind; label: string }[] = [
  { value: "strength", label: "Weight × reps" },
  { value: "cardio", label: "Time & distance" },
  { value: "time", label: "Time only" },
];

const muscleLabels = new Map(MUSCLES.map((m) => [m.value, m.label]));
const equipmentLabels = new Map(EQUIPMENT.map((e) => [e.value, e.label]));

export const muscleLabel = (m: Muscle) => muscleLabels.get(m) ?? m;
export const equipmentLabel = (e: Equipment) => equipmentLabels.get(e) ?? e;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** What an exercise works: its focus ("Upper chest"), or the muscle group for your own. */
export const focusLabel = (e: Pick<Exercise, "focus" | "muscle">) =>
  e.focus || muscleLabel(e.muscle);

/**
 * Exercises that work the same area, for when a machine is missing or taken:
 * same movement first, then the same muscle group. Leaves out `exclude`
 * (e.g. what's already in the workout).
 */
export function swapsFor(
  exercise: Exercise,
  all: Exercise[],
  exclude: string[] = [],
  limit = 6,
): Exercise[] {
  const skip = new Set([exercise.id, ...exclude]);
  const candidates = all.filter((e) => !skip.has(e.id));
  // The same movement is a swap even if it's logged differently (a plank for a
  // dead bug); for the same muscle only, it must be logged the same way.
  const rank = (e: Exercise) =>
    exercise.pattern && e.pattern === exercise.pattern
      ? 0
      : e.muscle === exercise.muscle && e.kind === exercise.kind
        ? 1
        : 2;
  return candidates
    .filter((e) => rank(e) < 2)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
