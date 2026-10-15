import { z } from "zod";
import { EQUIPMENT, KINDS, MUSCLES } from "@/lib/exercise-meta";

const optionalInt = (min: number, max: number) =>
  z
    .number()
    .int()
    .min(min)
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const routineInputSchema = z.object({
  name: z.string().trim().min(1, "Give the routine a name").max(60),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => v || null),
  exercises: z
    .array(
      z
        .object({
          exercise_id: z.uuid(),
          sets: z.number().int().min(1, "At least 1 set").max(20),
          reps_min: optionalInt(1, 100),
          reps_max: optionalInt(1, 100),
          rest_s: z.number().int().min(0).max(900),
        })
        .transform((e) =>
          // "12–8" means "8–12".
          e.reps_min && e.reps_max && e.reps_min > e.reps_max
            ? { ...e, reps_min: e.reps_max, reps_max: e.reps_min }
            : e,
        ),
    )
    .min(1, "Add at least one exercise")
    .max(30),
});
export type RoutineInput = z.input<typeof routineInputSchema>;

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(80),
  muscle: z.enum(MUSCLES.map((m) => m.value) as [string, ...string[]]),
  equipment: z.enum(EQUIPMENT.map((e) => e.value) as [string, ...string[]]),
  kind: z.enum(KINDS.map((k) => k.value) as [string, ...string[]]),
});
export type ExerciseInput = z.input<typeof exerciseInputSchema>;

const decimal = (max: number) => z.number().min(0).max(max).nullable();

export const setValuesSchema = z.object({
  reps: z.number().int().min(0).max(1000).nullable(),
  weight_kg: decimal(1000).transform((v) => (v === null ? null : Math.round(v * 100) / 100)),
  duration_s: z.number().int().min(0).max(86400).nullable(),
  distance_m: z.number().int().min(0).max(1000000).nullable(),
  is_warmup: z.boolean(),
  done: z.boolean(),
});
export type SetValuesInput = z.input<typeof setValuesSchema>;
