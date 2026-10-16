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
  glass_ml: number;
  remind_workout: boolean;
  remind_workout_at: string;
  remind_water: boolean;
  water_from: string;
  water_to: string;
  water_every_h: number;
  remind_meals: boolean;
  remind_meals_at: string;
  remind_weigh_in: boolean;
  weigh_in_weekday: number;
  weigh_in_at: string;
  notify_partner_workouts: boolean;
  /** Workouts a week, done in order on any days. Null = fixed weekdays. */
  weekly_goal: number | null;
  /** What comes next in the cycle, if the person picked it; cleared after a workout. */
  next_routine_id: string | null;
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
  /** What it works, e.g. "Upper chest". Null for your own exercises. */
  focus: string | null;
  /** Movement, e.g. "incline_press"; same pattern = a good swap. */
  pattern: string | null;
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

export type Meal = "breakfast" | "lunch" | "snack" | "dinner";
/** g / ml: nutrition per 100. piece: per one `serving` (a roti, a scoop). */
export type FoodUnit = "g" | "ml" | "piece";

export type Nutrients = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
};

export type Food = Nutrients & {
  id: string;
  /** null = built in. */
  owner_id: string | null;
  name: string;
  unit: FoodUnit;
  serving: string | null;
  default_amount: number;
};

export type MealEntry = Nutrients & {
  id: string;
  owner_id: string;
  date: string;
  meal: Meal;
  /** null for a quick add. */
  food_id: string | null;
  name: string;
  amount: number;
  unit: FoodUnit | null;
  serving: string | null;
  created_at: string;
};

export type HabitKind = "check" | "number";

export type Habit = {
  id: string;
  owner_id: string;
  name: string;
  /** A name from HABIT_ICONS. */
  icon: string;
  kind: HabitKind;
  target: number | null;
  unit: string | null;
  active: boolean;
  position: number;
};

export type HabitLog = { habit_id: string; date: string; value: number };

export type WaterLog = { id: string; date: string; ml: number; created_at: string };

export type BodyMetric = {
  id: string;
  owner_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  hips_cm: number | null;
  thighs_cm: number | null;
  notes: string | null;
};

export type Pose = "front" | "side" | "back";

export type ProgressPhoto = {
  id: string;
  date: string;
  pose: Pose;
  path: string;
  width: number | null;
  height: number | null;
};

export type MealIdeaItem = {
  id: string;
  position: number;
  food_id: string;
  amount: number;
  /** "If you're still hungry": unticked by default when logging. */
  optional: boolean;
};

export type MealIdea = {
  id: string;
  owner_id: string;
  position: number;
  meal: Meal;
  name: string;
  /** When it tends to fit ("11 AM", "Pre-workout"). Only a hint. */
  hint: string | null;
  note: string | null;
  items: MealIdeaItem[];
};
