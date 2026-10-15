import type { Equipment, ExerciseKind, Muscle } from "@/lib/types";

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
