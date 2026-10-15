import { z } from "zod";

const MEAL = z.enum(["breakfast", "lunch", "snack", "dinner"]);
const DATE = z.iso.date();
const grams = (max: number) =>
  z
    .number()
    .min(0)
    .max(max)
    .transform((v) => Math.round(v * 10) / 10);
const amount = z
  .number()
  .positive("Enter how much")
  .max(5000)
  .transform((v) => Math.round(v * 100) / 100);

export const addEntrySchema = z.object({
  date: DATE,
  meal: MEAL,
  food_id: z.uuid(),
  amount,
});
export type AddEntryInput = z.input<typeof addEntrySchema>;

export const quickAddSchema = z.object({
  date: DATE,
  meal: MEAL,
  name: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || "Quick add"),
  kcal: z.number().int("Whole calories").min(1, "Enter the calories").max(10000),
  protein_g: grams(1000),
  carbs_g: grams(1000),
  fat_g: grams(1000),
});
export type QuickAddInput = z.input<typeof quickAddSchema>;

export const updateEntrySchema = z.object({ meal: MEAL, amount });
export type UpdateEntryInput = z.input<typeof updateEntrySchema>;

export const foodInputSchema = z
  .object({
    name: z.string().trim().min(1, "Give it a name").max(80),
    unit: z.enum(["g", "ml", "piece"]),
    serving: z
      .string()
      .trim()
      .max(30)
      .nullable()
      .transform((v) => v || null),
    default_amount: amount,
    kcal: z.number().min(0).max(2000, "That's a lot of calories. Check the number"),
    protein_g: grams(500),
    carbs_g: grams(500),
    fat_g: grams(500),
    fibre_g: grams(500),
  })
  .transform((f) => ({
    ...f,
    kcal: Math.round(f.kcal * 10) / 10,
    serving: f.unit === "piece" ? (f.serving ?? "piece") : null,
  }));
export type FoodInput = z.input<typeof foodInputSchema>;

const optional = (min: number, max: number) => z.number().int().min(min).max(max).nullable();

export const targetsSchema = z.object({
  sex: z.enum(["male", "female"]).nullable(),
  height_cm: z.number().min(100).max(250).nullable(),
  birth_year: optional(1930, 2020),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["cut", "maintain", "bulk"]),
  target_kcal: optional(800, 6000),
  target_protein_g: optional(0, 500),
  target_carbs_g: optional(0, 1000),
  target_fat_g: optional(0, 400),
});
export type TargetsInput = z.input<typeof targetsSchema>;
