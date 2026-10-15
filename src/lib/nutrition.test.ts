import { describe, expect, it } from "vitest";
import {
  ageFrom,
  bmr,
  byMeal,
  formatAmount,
  maintenanceKcal,
  matchesFood,
  mealForHour,
  nutrientsFor,
  perLabel,
  recentFoodIds,
  suggestTargets,
  sum,
} from "./nutrition";

const him = {
  sex: "male" as const,
  weightKg: 75,
  heightCm: 175,
  age: 30,
  activity: "moderate" as const,
  goal: "maintain" as const,
};

describe("targets", () => {
  it("computes BMR with Mifflin-St Jeor", () => {
    expect(bmr(him)).toBe(1698.75);
    expect(bmr({ ...him, sex: "female" })).toBe(1532.75);
  });

  it("scales by activity", () => expect(maintenanceKcal(him)).toBe(2633));

  it("suggests maintenance macros", () => {
    const t = suggestTargets(him);
    expect(t).toEqual({ kcal: 2650, protein_g: 120, carbs_g: 376, fat_g: 74 });
    // The macros add back up to about the calories.
    expect(t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9).toBeCloseTo(2650, -1);
  });

  it("cuts 20% with more protein, bulks 10%", () => {
    expect(suggestTargets({ ...him, goal: "cut" })).toMatchObject({ kcal: 2100, protein_g: 150 });
    expect(suggestTargets({ ...him, goal: "bulk" })).toMatchObject({ kcal: 2900, protein_g: 135 });
  });

  it("never suggests negative carbs", () => {
    const t = suggestTargets({ ...him, weightKg: 200, heightCm: 120, age: 80, goal: "cut" });
    expect(t.carbs_g).toBeGreaterThanOrEqual(0);
  });

  it("works out age from the birth year", () => expect(ageFrom(1995, "2026-10-15")).toBe(31));
});

describe("nutrientsFor", () => {
  const rice = {
    unit: "g" as const,
    kcal: 130,
    protein_g: 2.7,
    carbs_g: 28.2,
    fat_g: 0.3,
    fibre_g: 0.4,
  };
  const egg = {
    unit: "piece" as const,
    kcal: 72,
    protein_g: 6.3,
    carbs_g: 0.4,
    fat_g: 4.8,
    fibre_g: 0,
  };

  it("scales per-100 g foods by grams", () => {
    expect(nutrientsFor(rice, 150)).toEqual({
      kcal: 195,
      protein_g: 4.1,
      carbs_g: 42.3,
      fat_g: 0.5,
      fibre_g: 0.6,
    });
  });

  it("scales piece foods by count", () => {
    expect(nutrientsFor(egg, 3)).toMatchObject({ kcal: 216, protein_g: 18.9 });
    expect(nutrientsFor(egg, 0.5)).toMatchObject({ kcal: 36 });
  });
});

describe("totals", () => {
  const e = (
    meal: "breakfast" | "lunch" | "snack" | "dinner",
    kcal: number,
    protein_g: number,
  ) => ({
    meal,
    kcal,
    protein_g,
    carbs_g: 10.05,
    fat_g: 1,
    fibre_g: 0,
  });

  it("adds up a day", () => {
    expect(sum([e("lunch", 400, 20.1), e("dinner", 350.4, 30.2)])).toEqual({
      kcal: 750,
      protein_g: 50.3,
      carbs_g: 20.1,
      fat_g: 2,
      fibre_g: 0,
    });
    expect(sum([]).kcal).toBe(0);
  });

  it("groups by meal in order", () => {
    const groups = byMeal([e("dinner", 1, 1), e("breakfast", 2, 2), e("dinner", 3, 3)]);
    expect(Object.keys(groups)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
    expect(groups.dinner).toHaveLength(2);
    expect(groups.lunch).toEqual([]);
  });
});

describe("helpers", () => {
  it("picks the meal for the time of day", () => {
    expect(mealForHour(8)).toBe("breakfast");
    expect(mealForHour(13)).toBe("lunch");
    expect(mealForHour(17)).toBe("snack");
    expect(mealForHour(21)).toBe("dinner");
  });

  it("formats amounts", () => {
    expect(formatAmount(150, "g", null)).toBe("150 g");
    expect(formatAmount(2, "piece", "chapati")).toBe("2 chapatis");
    expect(formatAmount(1, "piece", "scoop")).toBe("1 scoop");
    expect(formatAmount(0.5, "piece", "dosa")).toBe("½ dosa");
    expect(formatAmount(2, "piece", "slice")).toBe("2 slices");
    expect(formatAmount(1.5, "piece", "date")).toBe("1.5 dates");
    expect(formatAmount(3, "piece", "pazham")).toBe("3 pazhams");
    expect(formatAmount(2, "piece", "bench")).toBe("2 benches");
    expect(formatAmount(1, null, null)).toBe("");
    expect(perLabel({ unit: "piece", serving: "egg" })).toBe("per egg");
    expect(perLabel({ unit: "ml", serving: null })).toBe("per 100 ml");
  });

  it("lists recent foods once each, newest first", () => {
    const rows = [{ food_id: "a" }, { food_id: null }, { food_id: "b" }, { food_id: "a" }];
    expect(recentFoodIds(rows)).toEqual(["a", "b"]);
    expect(recentFoodIds(rows, 1)).toEqual(["a"]);
  });

  it("matches every word", () => {
    expect(matchesFood("Chicken breast (cooked)", "chick cook")).toBe(true);
    expect(matchesFood("Chicken curry", "chicken breast")).toBe(false);
  });
});
