import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  daysInMonth,
  isoWeekday,
  monthKeyIST,
  startOfWeek,
  toISTDate,
} from "./dates";

describe("IST conversion", () => {
  it("rolls over at IST midnight, not UTC midnight", () => {
    // 18:29 UTC = 23:59 IST, 18:30 UTC = 00:00 IST next day
    expect(toISTDate(new Date("2026-10-12T18:29:00Z"))).toBe("2026-10-12");
    expect(toISTDate(new Date("2026-10-12T18:30:00Z"))).toBe("2026-10-13");
  });

  it("month key follows IST", () => {
    expect(monthKeyIST(new Date("2026-10-31T18:20:00Z"))).toBe("2026-10"); // 23:50 IST
    expect(monthKeyIST(new Date("2026-10-31T18:40:00Z"))).toBe("2026-11"); // 00:10 IST
  });
});

describe("calendar arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-10-12", "2026-10-19")).toBe(7);
    expect(daysBetween("2026-10-19", "2026-10-12")).toBe(-7);
  });

  it("weeks start on Monday", () => {
    expect(isoWeekday("2026-10-12")).toBe(1); // Monday
    expect(isoWeekday("2026-10-18")).toBe(7); // Sunday
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-12")).toBe("2026-10-12");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
  });

  it("knows month lengths", () => {
    expect(daysInMonth("2026-02-10")).toBe(28);
    expect(daysInMonth("2028-02-10")).toBe(29);
    expect(daysInMonth("2026-10-01")).toBe(31);
  });
});
