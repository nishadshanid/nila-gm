"use client";

import { useState, useTransition } from "react";
import { Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddFoodDialog, EditEntryDialog } from "@/components/diet/add-food-dialog";
import { MEALS, byMeal, formatAmount, sum } from "@/lib/nutrition";
import type { Food, Meal, MealEntry } from "@/lib/types";
import { copyMeal } from "./actions";

/** The day's meals with what's in them; tap to add, tap an item to change it. */
export function MealLog({
  date,
  previousDate,
  previousLabel,
  entries,
  previousEntries,
  foods,
  recentIds,
  favouriteIds,
  defaultMeal,
}: {
  date: string;
  previousDate: string;
  /** "yesterday" or "Mon's". */
  previousLabel: string;
  entries: MealEntry[];
  previousEntries: MealEntry[];
  foods: Food[];
  recentIds: string[];
  favouriteIds: string[];
  /** The meal for the time of day. */
  defaultMeal: Meal;
}) {
  const [adding, setAdding] = useState<Meal | null>(null);
  const [lastMeal, setLastMeal] = useState<Meal>(defaultMeal);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [copying, startCopy] = useTransition();
  const groups = byMeal(entries);
  const previous = byMeal(previousEntries);

  function add(meal: Meal) {
    setLastMeal(meal);
    setAdding(meal);
  }

  function copy(meal: Meal, label: string) {
    startCopy(async () => {
      const r = await copyMeal(previousDate, date, meal);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Copied ${r.count} item${r.count === 1 ? "" : "s"} to ${label.toLowerCase()}`);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {MEALS.map((m) => {
          const items = groups[m.value];
          const before = previous[m.value];
          const total = sum(items);
          return (
            <section key={m.value} className="bg-card rounded-xl border">
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                <h2 className="flex-1 font-semibold">{m.label}</h2>
                {items.length > 0 && (
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {total.kcal} kcal · {Math.round(total.protein_g)} g P
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Add to ${m.label.toLowerCase()}`}
                  onClick={() => add(m.value)}
                >
                  <Plus />
                </Button>
              </div>
              {items.length > 0 ? (
                <ul className="pb-1">
                  {items.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-1.5 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{e.name}</span>
                          {e.unit && (
                            <span className="text-muted-foreground block text-xs">
                              {formatAmount(e.amount, e.unit, e.serving)}
                            </span>
                          )}
                        </span>
                        <span className="text-right text-sm tabular-nums">
                          {Math.round(e.kcal)}
                          <span className="text-muted-foreground block text-xs">
                            {Math.round(e.protein_g)} g P
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
                  <Button variant="outline" size="sm" onClick={() => add(m.value)}>
                    <Plus /> Add food
                  </Button>
                  {before.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={copying}
                      onClick={() => copy(m.value, m.label)}
                    >
                      <Copy /> Copy {previousLabel} ({sum(before).kcal} kcal)
                    </Button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <AddFoodDialog
        open={adding !== null}
        onOpenChange={(open) => !open && setAdding(null)}
        date={date}
        meal={adding ?? lastMeal}
        foods={foods}
        recentIds={recentIds}
        favouriteIds={favouriteIds}
      />
      <EditEntryDialog entry={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </>
  );
}
