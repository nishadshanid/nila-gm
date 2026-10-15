// Hand-written row types. Once the schema settles, `npm run db:types`
// generates src/lib/database.types.ts from the live database.

export type Goal = "cut" | "maintain" | "bulk";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";

export type Profile = {
  id: string;
  name: string;
  email: string;
  color: string;
  push_notifications: boolean;
  sex: "male" | "female" | null;
  height_cm: number | null;
  birth_year: number | null;
  goal: Goal;
  activity: Activity;
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  target_water_ml: number;
  target_steps: number;
  created_at: string;
  updated_at: string;
};

export type Person = Pick<Profile, "id" | "name" | "color">;

export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "cardio"
  | "full_body";
export type Equipment =
  "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell" | "band" | "other";
/** strength: weight × reps. cardio: time and distance. time: a hold, like a plank. */
export type ExerciseKind = "strength" | "cardio" | "time";

export type Exercise = {
  id: string;
  /** null = built in. */
  owner_id: string | null;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  kind: ExerciseKind;
};

export type RoutineExercise = {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_s: number;
  notes: string | null;
};

export type Routine = {
  id: string;
  owner_id: string;
  name: string;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type RoutineWithExercises = Routine & { routine_exercises: RoutineExercise[] };

export type ScheduleDay = { owner_id: string; weekday: number; routine_id: string };

export type Workout = {
  id: string;
  owner_id: string;
  date: string;
  routine_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  feeling: number | null;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  set_no: number;
  reps: number | null;
  weight_kg: number | null;
  duration_s: number | null;
  distance_m: number | null;
  rest_s: number;
  is_warmup: boolean;
  done: boolean;
  done_at: string | null;
};
