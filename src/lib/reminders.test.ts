import { describe, expect, it } from "vitest";
import {
  dueReminders,
  toMinutes,
  waterExpected,
  waterSlots,
  type DayState,
  type ReminderSettings,
} from "./reminders";

const settings: ReminderSettings = {
  remind_workout: true,
  remind_workout_at: "18:00:00",
  remind_water: true,
  water_from: "09:00:00",
  water_to: "21:00:00",
  water_every_h: 2,
  remind_meals: true,
  remind_meals_at: "21:00:00",
  remind_weigh_in: true,
  weigh_in_weekday: 1,
  weigh_in_at: "07:30:00",
};

const day: DayState = {
  weekday: 1,
  plannedRoutine: "Leg day",
  trained: false,
  waterMl: 3000,
  waterTarget: 3000,
  mealsLogged: 3,
  weighedIn: true,
};

const at = (t: string) => toMinutes(t);
const kinds = (s: ReminderSettings, d: DayState, t: string) =>
  dueReminders(s, d, "2026-10-12", at(t)).map((r) => r.kind);

describe("helpers", () => {
  it("reads times", () => {
    expect(toMinutes("18:30:00")).toBe(1110);
    expect(toMinutes("07:05")).toBe(425);
  });
  it("spaces water checks after the start", () => {
    expect(waterSlots(at("09:00"), at("21:00"), 2)).toEqual(
      ["11:00", "13:00", "15:00", "17:00", "19:00", "21:00"].map(at),
    );
    expect(waterSlots(at("09:00"), at("10:00"), 2)).toEqual([]);
  });
  it("expects water evenly through the day", () => {
    expect(waterExpected(3000, at("09:00"), at("21:00"), at("15:00"))).toBe(1500);
    expect(waterExpected(3000, at("09:00"), at("21:00"), at("08:00"))).toBe(0);
    expect(waterExpected(3000, at("09:00"), at("21:00"), at("22:00"))).toBe(3000);
  });
});

describe("workout reminder", () => {
  it("goes out from the set time on a planned day", () => {
    expect(kinds(settings, day, "17:45")).toEqual([]);
    expect(kinds(settings, day, "18:00")).toEqual(["workout"]);
    expect(dueReminders(settings, day, "2026-10-12", at("18:10"))[0]).toMatchObject({
      key: "2026-10-12",
      body: "Leg day is on the plan today. Ready when you are.",
    });
  });
  it("not once you've trained, on rest days, when off, or hours late", () => {
    expect(kinds(settings, { ...day, trained: true }, "18:00")).toEqual([]);
    expect(kinds(settings, { ...day, plannedRoutine: null }, "18:00")).toEqual([]);
    expect(kinds({ ...settings, remind_workout: false }, day, "18:00")).toEqual([]);
    expect(kinds(settings, day, "21:00")).toEqual([]);
  });
});

describe("water reminder", () => {
  const thirsty = { ...day, plannedRoutine: null, waterMl: 500 };
  it("nudges at a slot when behind", () => {
    // By 13:00 you'd have had 1 L; 500 ml is more than a glass behind.
    const due = dueReminders(settings, thirsty, "2026-10-12", at("13:10"));
    expect(due).toEqual([
      {
        kind: "water",
        key: "2026-10-12@780",
        body: "Water break: 500 ml of 3 L so far.",
        path: "/habits",
      },
    ]);
  });
  it("stays quiet when on track, between slots, or before the first one", () => {
    expect(kinds(settings, { ...thirsty, waterMl: 900 }, "13:10")).toEqual([]);
    expect(kinds(settings, thirsty, "14:05")).toEqual([]);
    expect(kinds(settings, { ...thirsty, waterMl: 0 }, "10:30")).toEqual([]);
  });
  it("is off by default-like settings", () => {
    expect(kinds({ ...settings, remind_water: false }, thirsty, "13:10")).toEqual([]);
  });
});

describe("meals and weigh-in", () => {
  it("asks for meals in the evening when fewer than two are logged", () => {
    const rest = { ...day, plannedRoutine: null };
    expect(kinds(settings, { ...rest, mealsLogged: 1 }, "21:00")).toEqual(["meals"]);
    expect(kinds(settings, { ...rest, mealsLogged: 2 }, "21:00")).toEqual([]);
  });
  it("asks for a weigh-in on the chosen weekday", () => {
    const rest = { ...day, plannedRoutine: null, weighedIn: false };
    expect(kinds(settings, rest, "07:30")).toEqual(["weigh_in"]);
    expect(kinds(settings, { ...rest, weekday: 2 }, "07:30")).toEqual([]);
    expect(kinds(settings, { ...rest, weighedIn: true }, "07:30")).toEqual([]);
  });
});

describe("flexible programme reminder", () => {
  const flexDay = (left: number, daysLeft: number): DayState => ({
    ...day,
    plannedRoutine: null,
    flexible: { next: "Day 3 · Shoulders + Abs", left, daysLeft },
  });
  it("reminds only when today is needed for the goal", () => {
    expect(dueReminders(settings, flexDay(3, 3), "2026-10-16", at("18:00"))).toEqual([
      {
        kind: "workout",
        key: "2026-10-16",
        body: "Day 3 · Shoulders + Abs is next. 3 workouts left this week.",
        path: "/workouts",
      },
    ]);
    expect(kinds(settings, flexDay(2, 4), "18:00")).toEqual([]);
    expect(kinds(settings, flexDay(0, 1), "18:00")).toEqual([]);
    expect(kinds(settings, { ...flexDay(3, 3), trained: true }, "18:00")).toEqual([]);
  });
  it("ignores the weekday plan in flexible mode", () => {
    expect(kinds(settings, { ...flexDay(1, 4), plannedRoutine: "Leg day" }, "18:00")).toEqual([]);
  });
});
