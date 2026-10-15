import { describe, expect, it } from "vitest";
import { weekStats, type WeekInput } from "./stats";

// Mon 12 Oct to Wed 14 Oct 2026 (the week so far).
const days = ["2026-10-12", "2026-10-13", "2026-10-14"];

const base: WeekInput = {
  days,
  plannedWeekdays: [1, 3, 5],
  workouts: [
    { date: "2026-10-12", volume: 5000.4 },
    { date: "2026-10-14", volume: 4000 },
    { date: "2026-10-09", volume: 9999 },
  ],
  food: new Map([
    ["2026-10-12", { kcal: 2100, protein_g: 150 }],
    ["2026-10-13", { kcal: 2600, protein_g: 120 }],
  ]),
  targets: { kcal: 2200, protein_g: 140 },
  water: new Map([
    ["2026-10-12", 3000],
    ["2026-10-13", 1500],
  ]),
  waterTarget: 3000,
  habits: new Map([
    ["2026-10-12", { met: 5, total: 5 }],
    ["2026-10-13", { met: 3, total: 5 }],
    ["2026-10-14", { met: 0, total: 5 }],
  ]),
  weights: [
    { date: "2026-10-10", kg: 80 },
    { date: "2026-10-14", kg: 79 },
  ],
};

describe("weekStats", () => {
  it("adds up the week", () => {
    expect(weekStats(base)).toEqual({
      days: 3,
      workouts: 2,
      planned: 2, // Monday and Wednesday so far
      volume: 9000,
      foodDays: 2,
      avgKcal: 2350,
      avgProtein: 135,
      kcalOnTarget: 1, // 2100 is within 10% of 2200; 2600 isn't
      proteinHit: 1,
      waterDays: 1,
      habitRate: 53, // 8 of 15
      weightChange: -0.5, // 80 before the week, 79.5 average on Wednesday
    });
  });

  it("leaves out what wasn't tracked", () => {
    const s = weekStats({
      ...base,
      food: new Map(),
      targets: null,
      habits: new Map(),
      weights: [],
    });
    expect(s.avgKcal).toBeNull();
    expect(s.kcalOnTarget).toBeNull();
    expect(s.habitRate).toBeNull();
    expect(s.weightChange).toBeNull();
  });

  it("measures weight within the week when there's nothing before it", () => {
    const s = weekStats({
      ...base,
      weights: [
        { date: "2026-10-12", kg: 80 },
        { date: "2026-10-14", kg: 79 },
      ],
    });
    expect(s.weightChange).toBe(-0.5);
    expect(
      weekStats({ ...base, weights: [{ date: "2026-10-12", kg: 80 }] }).weightChange,
    ).toBeNull();
  });
});
