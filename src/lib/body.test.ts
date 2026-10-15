import { describe, expect, it } from "vitest";
import { bmi, bmiLabel, buildChart, formatChange, movingAverage, summarize } from "./body";

const points = [
  { date: "2026-10-01", kg: 80 },
  { date: "2026-10-02", kg: 81 },
  { date: "2026-10-04", kg: 79 },
  { date: "2026-10-08", kg: 78 },
  { date: "2026-10-15", kg: 77 },
];

describe("movingAverage", () => {
  it("averages the weigh-ins in the 7 days up to each one", () => {
    const t = movingAverage(points);
    expect(t.map((p) => p.avg)).toEqual([80, 80.5, 80, 79.33, 77]);
  });
  it("handles a single weigh-in", () => {
    expect(movingAverage([{ date: "2026-10-01", kg: 70 }])[0].avg).toBe(70);
  });
});

describe("summarize", () => {
  it("reports the trend, the week's change and the change since the start", () => {
    const s = summarize(movingAverage(points))!;
    expect(s.current).toBe(77); // the 8th is outside the 7 days up to the 15th
    expect(s.weekChange).toBe(-2.3); // 77 now vs 79.33 on the 8th
    expect(s.sinceStart).toBe(-3);
    expect(s.latest).toEqual({ date: "2026-10-15", kg: 77 });
  });
  it("has no weekly change without a reading a week back", () => {
    expect(summarize(movingAverage(points.slice(0, 2)))!.weekChange).toBeNull();
  });
  it("is null with no data", () => expect(summarize([])).toBeNull());
});

describe("bmi", () => {
  it("computes and labels BMI", () => {
    expect(bmi(75, 175)).toBe(24.5);
    expect(bmiLabel(24.5)).toBe("Overweight");
    expect(bmiLabel(21)).toBe("Healthy");
    expect(bmiLabel(17)).toBe("Underweight");
    expect(bmiLabel(30)).toBe("Obese");
  });
});

describe("formatChange", () => {
  it("signs the change", () => {
    expect(formatChange(0.4)).toBe("+0.4 kg");
    expect(formatChange(-1.2)).toBe("−1.2 kg");
    expect(formatChange(0)).toBe("±0 kg");
  });
});

describe("buildChart", () => {
  it("places points by date and weight inside the box", () => {
    const c = buildChart(movingAverage(points), 300, 100);
    expect(c.dots[0].x).toBe(36);
    expect(c.dots.at(-1)!.x).toBe(292);
    for (const d of c.dots) {
      expect(d.y).toBeGreaterThanOrEqual(8);
      expect(d.y).toBeLessThanOrEqual(92);
    }
    expect(c.line.startsWith("M36 ")).toBe(true);
    // Heavier is higher up.
    expect(c.dots[1].y).toBeLessThan(c.dots[4].y);
  });
  it("uses round gridlines that cover the data", () => {
    const { ticks } = buildChart(movingAverage(points), 300, 100);
    expect(ticks[0].kg).toBeLessThanOrEqual(77);
    expect(ticks.at(-1)!.kg).toBeGreaterThanOrEqual(81);
    expect(ticks.every((t) => Number.isInteger(t.kg * 2))).toBe(true);
  });
  it("centres a single point and widens a flat range", () => {
    const c = buildChart(movingAverage([{ date: "2026-10-01", kg: 70 }]), 300, 100);
    expect(c.dots[0].x).toBe(164);
    expect(c.ticks.length).toBeGreaterThan(1);
  });
  it("is empty without data", () => expect(buildChart([], 300, 100).dots).toEqual([]));
});
