"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import { tapFeedback } from "@/lib/haptics";
import { MEALS, amountStep, formatAmount, nutrientsFor, sum } from "@/lib/nutrition";
import type { Food, Meal, MealIdea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { itemLabel } from "@/lib/meal-ideas";

type Row = { food: Food; amount: number; on: boolean };

/**
 * One idea's foods, each with a tick and an amount to change, the total, and a
 * meal to add it to. Optional foods ("if still hungry") start unticked.
 */
export function IdeaReview({
  idea,
  foods,
  meal,
  onMealChange,
  partner,
  onBack,
  onSubmit,
}: {
  idea: MealIdea;
  foods: Map<string, Food>;
  meal: Meal;
  onMealChange: (m: Meal) => void;
  /** Cooking for both: your partner's amounts of the foods you share. */
  partner: { name: string; items: { food_id: string; amount: number }[] } | null;
  onBack: () => void;
  /** Returns an error message, or nothing when it worked. */
  onSubmit: (items: { food_id: string; amount: number }[]) => Promise<string | void>;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    idea.items.flatMap((it) => {
      const food = foods.get(it.food_id);
      return food ? [{ food, amount: it.amount, on: !it.optional }] : [];
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const total = sum(rows.filter((r) => r.on).map((r) => nutrientsFor(r.food, r.amount)));

  const change = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function bump(i: number, by: number) {
    tapFeedback();
    const r = rows[i];
    change(i, {
      amount: Math.max(amountStep(r.food.unit), Math.round((r.amount + by) * 100) / 100),
    });
  }

  function submit() {
    setError(null);
    const chosen = rows.filter((r) => r.on);
    if (chosen.length === 0) return setError("Tick at least one food");
    startTransition(async () => {
      const failed = await onSubmit(chosen.map((r) => ({ food_id: r.food.id, amount: r.amount })));
      if (failed) setError(failed);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {(idea.hint || idea.note) && (
        <p className="text-muted-foreground -mt-2 text-sm">
          {[idea.hint, idea.note].filter(Boolean).join(" · ")}
        </p>
      )}
      <ul className="-mx-1 divide-y">
        {rows.map((r, i) => {
          const step = amountStep(r.food.unit);
          return (
            <li key={r.food.id + i} className="flex items-center gap-2 px-1 py-2">
              <input
                type="checkbox"
                checked={r.on}
                onChange={(e) => change(i, { on: e.target.checked })}
                aria-label={`Include ${r.food.name}`}
                className="size-5 shrink-0 accent-green-600"
              />
              <span className={cn("min-w-0 flex-1", !r.on && "opacity-50")}>
                <span className="block truncate text-sm font-medium">{r.food.name}</span>
                <span className="text-muted-foreground block text-xs tabular-nums">
                  {formatAmount(r.amount, r.food.unit, r.food.serving)} ·{" "}
                  {nutrientsFor(r.food, r.amount).kcal} kcal
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Less ${r.food.name}`}
                disabled={!r.on}
                onClick={() => bump(i, -step)}
              >
                <Minus />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`More ${r.food.name}`}
                disabled={!r.on}
                onClick={() => bump(i, step)}
              >
                <Plus />
              </Button>
            </li>
          );
        })}
      </ul>

      {partner && partner.items.length > 0 && (
        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <Users className="mt-0.5 size-4 shrink-0" />
          <span>
            {partner.name}&apos;s portion:{" "}
            {partner.items
              .flatMap((p) => {
                const f = foods.get(p.food_id);
                if (!f) return [];
                return [itemLabel(f, p.amount)];
              })
              .join(", ")}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label>Meal</Label>
        <Segmented
          value={meal}
          onChange={onMealChange}
          aria-label="Meal"
          options={MEALS.map((m) => ({
            value: m.value,
            label: <span className="max-[359px]:text-xs">{m.label}</span>,
          }))}
        />
      </div>

      <div className="bg-muted/60 grid grid-cols-4 gap-1 rounded-lg p-3 text-center">
        {[
          ["kcal", total.kcal],
          ["Protein", `${Math.round(total.protein_g)} g`],
          ["Carbs", `${Math.round(total.carbs_g)} g`],
          ["Fat", `${Math.round(total.fat_g)} g`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="font-heading truncate text-lg font-semibold tabular-nums">{value}</p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft /> Back
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Adding…" : `Add ${rows.filter((r) => r.on).length} foods`}
        </Button>
      </div>
    </div>
  );
}
