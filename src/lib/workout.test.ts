import { describe, expect, it } from "vitest";
import {
  bests,
  describePR,
  e1rm,
  findPRs,
  formatClock,
  formatMinutes,
  formatSet,
  formatSetShort,
  lastTimeByExercise,
  repsLabel,
  routineForDay,
  volume,
} from "./workout";

const set = (
  exercise_id: string,
  weight_kg: number | null,
  reps: number | null,
  extra: Partial<{
    done: boolean;
    is_warmup: boolean;
    duration_s: number;
    distance_m: number;
  }> = {},
) => ({
  exercise_id,
  weight_kg,
  reps,
  duration_s: extra.duration_s ?? null,
  distance_m: extra.distance_m ?? null,
  done: extra.done ?? true,
  is_warmup: extra.is_warmup ?? false,
});

describe("e1rm", () => {
  it("uses Epley", () => {
    expect(e1rm(100, 10)).toBe(133.3);
    expect(e1rm(60, 5)).toBe(70);
  });
  it("a single rep is its own max", () => expect(e1rm(100, 1)).toBe(100));
  it("is 0 without weight or reps", () => {
    expect(e1rm(null, 10)).toBe(0);
    expect(e1rm(50, 0)).toBe(0);
  });
});

describe("volume", () => {
  it("adds weight × reps of done working sets only", () => {
    expect(
      volume([
        set("a", 40, 10),
        set("a", 42.5, 8),
        set("a", 20, 10, { is_warmup: true }),
        set("a", 40, 10, { done: false }),
        set("b", null, 15),
      ]),
    ).toBe(740);
  });
});

describe("routineForDay", () => {
  const schedule = [
    { owner_id: "me", weekday: 1, routine_id: "push" },
    { owner_id: "me", weekday: 3, routine_id: "pull" },
  ];
  it("finds the planned routine", () => expect(routineForDay(schedule, 3)).toBe("pull"));
  it("is null on rest days", () => expect(routineForDay(schedule, 2)).toBeNull());
});

describe("bests and PRs", () => {
  const before = [set("bench", 60, 8), set("bench", 57.5, 10), set("pullup", null, 8)];

  it("collects each exercise's bests", () => {
    const b = bests(before).get("bench")!;
    expect(b.maxWeight).toBe(60);
    expect(b.bestE1rm).toBe(76.7);
    expect(bests(before).get("pullup")!.maxReps).toBe(8);
  });

  it("finds a heavier weight first", () => {
    expect(findPRs([set("bench", 62.5, 5)], before)).toEqual([
      { exerciseId: "bench", kind: "weight", value: 62.5, previous: 60 },
    ]);
  });

  it("finds a better estimated 1RM at the same weight", () => {
    expect(findPRs([set("bench", 60, 10)], before)).toEqual([
      { exerciseId: "bench", kind: "e1rm", value: 80, previous: 76.7 },
    ]);
  });

  it("counts reps for bodyweight exercises", () => {
    expect(findPRs([set("pullup", null, 10)], before)[0]).toMatchObject({
      kind: "reps",
      value: 10,
    });
  });

  it("isn't a record the first time, or when not better", () => {
    expect(findPRs([set("squat", 100, 5)], before)).toEqual([]);
    expect(findPRs([set("bench", 55, 8)], before)).toEqual([]);
  });

  it("ignores warm-ups and unticked sets", () => {
    expect(findPRs([set("bench", 100, 1, { is_warmup: true })], before)).toEqual([]);
    expect(findPRs([set("bench", 100, 1, { done: false })], before)).toEqual([]);
  });

  it("describes a record", () => {
    expect(describePR({ exerciseId: "x", kind: "weight", value: 62.5, previous: 60 })).toBe(
      "Heaviest: 62.5 kg (was 60 kg)",
    );
  });
});

describe("lastTimeByExercise", () => {
  it("keeps only the newest workout's sets per exercise", () => {
    const rows = [
      { workout_id: "w3", exercise_id: "bench", set_no: 1 },
      { workout_id: "w3", exercise_id: "bench", set_no: 2 },
      { workout_id: "w2", exercise_id: "bench", set_no: 1 },
      { workout_id: "w2", exercise_id: "squat", set_no: 1 },
    ];
    const last = lastTimeByExercise(rows);
    expect(last.get("bench")!.map((r) => `${r.workout_id}/${r.set_no}`)).toEqual(["w3/1", "w3/2"]);
    expect(last.get("squat")!.map((r) => r.workout_id)).toEqual(["w2"]);
  });
});

describe("formatting", () => {
  it("formats sets by kind", () => {
    const base = { reps: null, weight_kg: null, duration_s: null, distance_m: null };
    expect(formatSet({ ...base, weight_kg: 42.5, reps: 8 }, "strength")).toBe("42.5 kg × 8");
    expect(formatSet({ ...base, reps: 12 }, "strength")).toBe("× 12");
    expect(formatSet({ ...base, duration_s: 1200, distance_m: 3200 }, "cardio")).toBe(
      "20:00 · 3.2 km",
    );
    expect(formatSet({ ...base, duration_s: 60 }, "time")).toBe("1:00");
  });
  it("formats sets short for the logger", () => {
    const base = { reps: null, weight_kg: null, duration_s: null, distance_m: null };
    expect(formatSetShort({ ...base, weight_kg: 22.5, reps: 10 }, "strength")).toBe("22.5×10");
    expect(formatSetShort({ ...base, reps: 12 }, "strength")).toBe("×12");
    expect(formatSetShort({ ...base, duration_s: 1200, distance_m: 2500 }, "cardio")).toBe(
      "20′ 2.5k",
    );
  });
  it("formats clocks and durations", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatMinutes(45 * 60000)).toBe("45 min");
    expect(formatMinutes(65 * 60000)).toBe("1 h 5 min");
  });
  it("formats rep targets", () => {
    expect(repsLabel(8, 12)).toBe("8–12");
    expect(repsLabel(10, 10)).toBe("10");
    expect(repsLabel(null, null)).toBe("");
  });
});
