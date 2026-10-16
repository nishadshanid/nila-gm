import { MEALS, formatAmount, nutrientsFor, sum } from "@/lib/nutrition";
import type { Food, Meal, MealIdea, MealIdeaItem, Nutrients } from "@/lib/types";

/** What an idea adds up to. Optional items count only when `withOptional`. */
export function ideaTotals(
  items: Pick<MealIdeaItem, "food_id" | "amount" | "optional">[],
  foods: Map<string, Food>,
  withOptional = false,
): Nutrients {
  return sum(
    items.flatMap((it) => {
      const food = foods.get(it.food_id);
      return food && (withOptional || !it.optional) ? [nutrientsFor(food, it.amount)] : [];
    }),
  );
}

/** Ideas for the meal you're adding to first, then the rest in meal order. */
export function ideasForMeal<T extends Pick<MealIdea, "meal" | "position">>(
  ideas: T[],
  meal: Meal,
): T[] {
  const order = (m: Meal) => (m === meal ? -1 : MEALS.findIndex((x) => x.value === m));
  return [...ideas].sort((a, b) => order(a.meal) - order(b.meal) || a.position - b.position);
}

/**
 * Cooking for both: your partner's idea for the same meal that shares the most
 * foods with yours, and their amounts of those shared foods.
 */
export function partnerPortion(
  mine: Pick<MealIdea, "meal" | "items">,
  theirs: Pick<MealIdea, "meal" | "items">[],
): { food_id: string; amount: number }[] {
  const foods = new Set(mine.items.map((i) => i.food_id));
  let best: { food_id: string; amount: number }[] = [];
  for (const idea of theirs) {
    if (idea.meal !== mine.meal) continue;
    const shared = idea.items
      .filter((i) => !i.optional && foods.has(i.food_id))
      .map(({ food_id, amount }) => ({ food_id, amount }));
    if (shared.length > best.length) best = shared;
  }
  // One shared food (say, an egg) isn't really cooking together.
  return best.length >= 2 ? best : [];
}

/** "Chicken, home-cooked pieces" → "chicken", "Egg (whole, boiled)" → "egg". */
export function shortName(name: string): string {
  return name.split(/[,(/]/)[0].trim().toLowerCase();
}

/** "4 idlis", "rice 250 g": how a food reads in a list of an idea's foods. */
export function itemLabel(food: Pick<Food, "name" | "unit" | "serving">, amount: number): string {
  return food.unit === "piece"
    ? formatAmount(amount, food.unit, food.serving)
    : `${shortName(food.name)} ${formatAmount(amount, food.unit, null)}`;
}
