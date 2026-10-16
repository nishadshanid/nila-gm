import { describe, expect, it } from "vitest";
import { focusLabel, swapsFor } from "./exercise-meta";
import type { Exercise } from "./types";

const ex = (
  id: string,
  name: string,
  muscle: Exercise["muscle"],
  pattern: string | null,
): Exercise => ({
  id,
  owner_id: null,
  name,
  muscle,
  equipment: "machine",
  kind: "strength",
  focus: pattern ? "Focus" : null,
  pattern,
});

const all = [
  ex("pec", "Pec Deck", "chest", "chest_fly"),
  ex("cable", "Cable Crossover", "chest", "chest_fly"),
  ex("fly", "Dumbbell Fly", "chest", "chest_fly"),
  ex("bench", "Bench Press", "chest", "horizontal_press"),
  ex("row", "Seated Cable Row", "back", "row"),
  { ...ex("plank", "Plank", "core", "core_hold"), kind: "time" as const },
];

describe("swapsFor", () => {
  it("puts the same movement first, then the same muscle", () => {
    expect(swapsFor(all[0], all).map((e) => e.id)).toEqual(["cable", "fly", "bench"]);
  });
  it("leaves out what's already in the workout", () => {
    expect(swapsFor(all[0], all, ["cable"]).map((e) => e.id)).toEqual(["fly", "bench"]);
  });
  it("matches the movement across kinds, the muscle only within a kind", () => {
    const deadBug = ex("bug", "Dead Bug", "core", "core_hold");
    const crunch = ex("crunch", "Crunch", "core", "core_flex");
    expect(swapsFor(all[5], [...all, deadBug, crunch]).map((e) => e.id)).toEqual(["bug"]);
  });
  it("falls back to the muscle for your own exercises", () => {
    expect(swapsFor(ex("mine", "My press", "chest", null), all).map((e) => e.id)).toEqual([
      "bench",
      "cable",
      "fly",
      "pec",
    ]);
  });
});

describe("focusLabel", () => {
  it("uses the focus, or the muscle group", () => {
    expect(focusLabel({ focus: "Upper chest", muscle: "chest" })).toBe("Upper chest");
    expect(focusLabel({ focus: null, muscle: "chest" })).toBe("Chest");
  });
});
