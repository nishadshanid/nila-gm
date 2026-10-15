import { describe, expect, it } from "vitest";
import { routineInputSchema, setValuesSchema } from "./workout-schema";

const ex = "8b0f6a59-6f0b-4c51-9a38-2a3cb3a0d6b1";

describe("routineInputSchema", () => {
  it("needs a name and an exercise", () => {
    expect(routineInputSchema.safeParse({ name: " ", exercises: [] }).success).toBe(false);
    expect(routineInputSchema.safeParse({ name: "Push", exercises: [] }).success).toBe(false);
  });
  it("swaps a reversed rep range", () => {
    const r = routineInputSchema.parse({
      name: "Push",
      exercises: [{ exercise_id: ex, sets: 3, reps_min: 12, reps_max: 8, rest_s: 90 }],
    });
    expect(r.exercises[0]).toMatchObject({ reps_min: 8, reps_max: 12 });
  });
});

describe("setValuesSchema", () => {
  it("rounds weight to 2 decimals", () => {
    const s = setValuesSchema.parse({
      reps: 8,
      weight_kg: 42.499,
      duration_s: null,
      distance_m: null,
      is_warmup: false,
      done: true,
    });
    expect(s.weight_kg).toBe(42.5);
  });
});
