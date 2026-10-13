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
