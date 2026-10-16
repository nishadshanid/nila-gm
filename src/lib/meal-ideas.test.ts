import { describe, expect, it } from "vitest";
import { ideaTotals, ideasForMeal, itemLabel, partnerPortion, shortName } from "./meal-ideas";
import type { Food } from "./types";

const food = (id: string, unit: Food["unit"], kcal: number, protein_g: number): Food => ({
  id,
  owner_id: null,
  name: id,
  unit,
  serving: unit === "piece" ? id : null,
  default_amount: 1,
  kcal,
  protein_g,
  carbs_g: 0,
  fat_g: 0,
  fibre_g: 0,
});
const foods = new Map(
  [
    food("idli", "piece", 58, 2),
    food("egg", "piece", 72, 6.3),
    food("sambar", "g", 65, 3),
    food("banana", "piece", 105, 1.3),
  ].map((f) => [f.id, f]),
);
const item = (food_id: string, amount: number, optional = false) => ({
  id: food_id,
  position: 0,
  food_id,
  amount,
  optional,
});

describe("ideaTotals", () => {
  const items = [item("idli", 4), item("egg", 2), item("sambar", 150), item("banana", 1, true)];
  it("adds up the foods, leaving out optional ones", () => {
    expect(ideaTotals(items, foods)).toMatchObject({ kcal: 474, protein_g: 25.1 });
  });
  it("can include optional ones", () => {
    expect(ideaTotals(items, foods, true).kcal).toBe(579);
  });
});

describe("ideasForMeal", () => {
  it("puts the meal you're adding to first", () => {
    const ideas = [
      { meal: "breakfast" as const, position: 0, id: "b" },
      { meal: "dinner" as const, position: 0, id: "d" },
      { meal: "snack" as const, position: 1, id: "s2" },
      { meal: "snack" as const, position: 0, id: "s1" },
    ];
    expect(ideasForMeal(ideas, "snack").map((i) => i.id)).toEqual(["s1", "s2", "b", "d"]);
  });
});

describe("partnerPortion", () => {
  const mine = {
    meal: "lunch" as const,
    items: [item("rice", 250), item("chicken", 135), item("egg", 1)],
  };
  it("finds their idea for the same meal sharing the most foods", () => {
    const theirs = [
      { meal: "lunch" as const, items: [item("rice", 125), item("chicken", 110), item("egg", 1)] },
      { meal: "lunch" as const, items: [item("rice", 125), item("dal", 110)] },
      { meal: "dinner" as const, items: [item("rice", 1), item("chicken", 1), item("egg", 1)] },
    ];
    expect(partnerPortion(mine, theirs)).toEqual([
      { food_id: "rice", amount: 125 },
      { food_id: "chicken", amount: 110 },
      { food_id: "egg", amount: 1 },
    ]);
  });
  it("needs at least two shared foods", () => {
    expect(partnerPortion(mine, [{ meal: "lunch", items: [item("egg", 1)] }])).toEqual([]);
  });
});

describe("labels", () => {
  it("shortens food names and reads amounts naturally", () => {
    expect(shortName("Chicken, home-cooked pieces")).toBe("chicken");
    expect(shortName("Egg (whole, boiled)")).toBe("egg");
    expect(shortName("Curd / dahi")).toBe("curd");
    expect(itemLabel({ name: "Idli", unit: "piece", serving: "idli" }, 4)).toBe("4 idlis");
    expect(itemLabel({ name: "Kerala matta rice (cooked)", unit: "g", serving: null }, 250)).toBe(
      "kerala matta rice 250 g",
    );
  });
});
