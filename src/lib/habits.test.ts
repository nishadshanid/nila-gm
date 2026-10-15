import { describe, expect, it } from "vitest";
import {
  formatMl,
  formatProgress,
  isDayComplete,
  isMet,
  streak,
  waterByDay,
  waterMetDates,
} from "./habits";

describe("isMet", () => {
  const check = { kind: "check" as const, target: null };
  const steps = { kind: "number" as const, target: 10000 };
  it("needs a tick for check habits", () => {
    expect(isMet(check, 1)).toBe(true);
    expect(isMet(check, 0)).toBe(false);
    expect(isMet(check, undefined)).toBe(false);
  });
  it("needs the target for number habits", () => {
    expect(isMet(steps, 10000)).toBe(true);
    expect(isMet(steps, 9999)).toBe(false);
  });
});

describe("streak", () => {
  const today = "2026-10-15";
  it("counts back from today when today is done", () => {
    expect(streak(new Set(["2026-10-15", "2026-10-14", "2026-10-13", "2026-10-11"]), today)).toBe(
      3,
    );
  });
  it("doesn't break just because today isn't done yet", () => {
    expect(streak(new Set(["2026-10-14", "2026-10-13"]), today)).toBe(2);
  });
  it("is 0 after a missed day", () => {
    expect(streak(new Set(["2026-10-13"]), today)).toBe(0);
    expect(streak(new Set(), today)).toBe(0);
  });
  it("crosses months", () => {
    expect(streak(new Set(["2026-11-01", "2026-10-31", "2026-10-30"]), "2026-11-01")).toBe(3);
  });
});

describe("water", () => {
  it("adds up per day and finds days that met the target", () => {
    const totals = waterByDay([
      { date: "2026-10-14", ml: 2000 },
      { date: "2026-10-14", ml: 1000 },
      { date: "2026-10-15", ml: 500 },
    ]);
    expect(totals.get("2026-10-14")).toBe(3000);
    expect([...waterMetDates(totals, 3000)]).toEqual(["2026-10-14"]);
  });
  it("formats amounts", () => {
    expect(formatMl(750)).toBe("750 ml");
    expect(formatMl(1750)).toBe("1.75 L");
    expect(formatMl(3000)).toBe("3 L");
  });
});

describe("isDayComplete", () => {
  const base = {
    workoutDone: true,
    restDay: false,
    waterMl: 3000,
    waterTarget: 3000,
    habitsMet: [true, true],
  };
  it("is complete when everything is done", () => expect(isDayComplete(base)).toBe(true));
  it("counts a rest day as training done", () =>
    expect(isDayComplete({ ...base, workoutDone: false, restDay: true })).toBe(true));
  it("needs the workout, the water and every habit", () => {
    expect(isDayComplete({ ...base, workoutDone: false })).toBe(false);
    expect(isDayComplete({ ...base, waterMl: 2999 })).toBe(false);
    expect(isDayComplete({ ...base, habitsMet: [true, false] })).toBe(false);
  });
  it("works with no habits", () => expect(isDayComplete({ ...base, habitsMet: [] })).toBe(true));
});

describe("formatProgress", () => {
  it("shows value against target", () => {
    expect(formatProgress(8500, { target: 10000, unit: "steps" })).toBe("8,500 / 10,000 steps");
    expect(formatProgress(6.5, { target: 7, unit: "h" })).toBe("6.5 / 7 h");
    expect(formatProgress(3, { target: null, unit: null })).toBe("3");
  });
});
