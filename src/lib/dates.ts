import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

/** Everything in Nila Gym runs on India time; weeks start on Monday. */
export const TZ = "Asia/Kolkata";

/** A calendar date with no time or timezone, formatted "yyyy-MM-dd". */
export type DateStr = string;

const DAY_MS = 86_400_000;

/** Calendar date in IST for an instant (defaults to now). */
export function toISTDate(instant: Date | number | string = new Date()): DateStr {
  return format(new TZDate(new Date(instant).getTime(), TZ), "yyyy-MM-dd");
}

export function todayIST(now: Date = new Date()): DateStr {
  return toISTDate(now);
}

/** "yyyy-MM" month key in IST, used for monthly points. */
export function monthKeyIST(instant: Date | number | string = new Date()): string {
  return toISTDate(instant).slice(0, 7);
}

// Calendar-date arithmetic. Dates are treated as UTC midnights so the host
// timezone and DST never affect the result.

function toUTC(date: DateStr): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date: ${date}`);
  return Date.parse(`${date}T00:00:00Z`);
}

function fromUTC(ms: number): DateStr {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: DateStr, days: number): DateStr {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

/** Whole days from `a` to `b` (negative if b is before a). */
export function daysBetween(a: DateStr, b: DateStr): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: DateStr): number {
  const d = new Date(toUTC(date)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: DateStr): DateStr {
  return addDays(date, 1 - isoWeekday(date));
}

/** Last day of the month containing `date`. */
export function daysInMonth(date: DateStr): number {
  const d = new Date(toUTC(date));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

/** "Mon, 12 Oct" style label for a calendar date. */
export function formatDay(date: DateStr, pattern = "EEE, d MMM"): string {
  const d = new Date(toUTC(date));
  return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), pattern);
}

/** "Today", "Tomorrow", "Yesterday", or "Mon, 12 Oct". */
export function relativeDay(date: DateStr, today: DateStr): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDay(date, date.slice(0, 4) === today.slice(0, 4) ? "EEE, d MMM" : "d MMM yyyy");
}
