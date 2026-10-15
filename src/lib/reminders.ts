import { formatMl } from "@/lib/habits";

export type ReminderSettings = {
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
};

export type DayState = {
  /** ISO weekday, 1 = Monday. */
  weekday: number;
  /** Name of the routine planned for today, or null on a rest day. */
  plannedRoutine: string | null;
  /** A workout was started (or finished) today. */
  trained: boolean;
  waterMl: number;
  waterTarget: number;
  /** How many different meals have something logged. */
  mealsLogged: number;
  weighedIn: boolean;
};

export type ReminderKind = "workout" | "water" | "meals" | "weigh_in";
export type Due = { kind: ReminderKind; key: string; body: string; path: string };

/** A reminder that's this late (the tick was down) isn't worth sending any more. */
const GRACE_MIN = 180;
/** Water nudges only go out in the hour after their slot. */
const WATER_GRACE_MIN = 60;

/** "18:30" or "18:30:00" → minutes after midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

const inWindow = (now: number, at: number, grace = GRACE_MIN) => now >= at && now < at + grace;

/** Water check times: every N hours after the start, up to the end. */
export function waterSlots(from: number, to: number, everyH: number): number[] {
  const slots: number[] = [];
  for (let t = from + everyH * 60; t <= to; t += everyH * 60) slots.push(t);
  return slots;
}

/** How much water you'd have had by `at`, drinking evenly from start to end. */
export function waterExpected(target: number, from: number, to: number, at: number): number {
  if (at <= from) return 0;
  if (at >= to) return target;
  return Math.round((target * (at - from)) / (to - from));
}

/**
 * Which reminders are due now. Each has a key (unique per day, or per slot for
 * water), so the notification log can make sure it's sent once.
 */
export function dueReminders(
  s: ReminderSettings,
  day: DayState,
  date: string,
  /** India time, minutes after midnight. */
  now: number,
): Due[] {
  const due: Due[] = [];

  if (
    s.remind_workout &&
    day.plannedRoutine &&
    !day.trained &&
    inWindow(now, toMinutes(s.remind_workout_at))
  ) {
    due.push({
      kind: "workout",
      key: date,
      body: `${day.plannedRoutine} is on the plan today. Ready when you are.`,
      path: "/workouts",
    });
  }

  if (s.remind_water && day.waterMl < day.waterTarget) {
    const from = toMinutes(s.water_from);
    const to = toMinutes(s.water_to);
    const slot = waterSlots(from, to, s.water_every_h).findLast((t) => t <= now);
    if (slot !== undefined && inWindow(now, slot, WATER_GRACE_MIN)) {
      const expected = waterExpected(day.waterTarget, from, to, slot);
      // Behind by more than a glass.
      if (day.waterMl < expected - 250) {
        due.push({
          kind: "water",
          key: `${date}@${slot}`,
          body: `Water break: ${formatMl(day.waterMl)} of ${formatMl(day.waterTarget)} so far.`,
          path: "/habits",
        });
      }
    }
  }

  if (s.remind_meals && day.mealsLogged < 2 && inWindow(now, toMinutes(s.remind_meals_at))) {
    due.push({
      kind: "meals",
      key: date,
      body:
        day.mealsLogged === 0
          ? "Nothing logged to eat today. Add your meals while you remember them."
          : "Only one meal logged today. Add the rest while you remember them.",
      path: "/diet",
    });
  }

  if (
    s.remind_weigh_in &&
    day.weekday === s.weigh_in_weekday &&
    !day.weighedIn &&
    inWindow(now, toMinutes(s.weigh_in_at))
  ) {
    due.push({
      kind: "weigh_in",
      key: date,
      body: "Weigh-in day. Step on the scale before breakfast.",
      path: "/body",
    });
  }

  return due;
}
