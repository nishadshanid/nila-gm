"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FoodForm } from "@/components/diet/food-form";
import { perLabel } from "@/lib/nutrition";
import type { Food } from "@/lib/types";
import { deleteFood } from "../actions";

export function MyFoods({ foods }: { foods: Food[] }) {
  // undefined = closed, null = new food.
  const [editing, setEditing] = useState<Food | null | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function remove(food: Food) {
    if (!confirm(`Delete "${food.name}"? Meals you already logged keep their numbers.`)) return;
    startTransition(async () => {
      const r = await deleteFood(food.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Food deleted");
      setEditing(undefined);
    });
  }

  return (
    <div className="flex max-w-lg flex-col gap-3">
      {foods.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          Nothing here yet. The built-in list has about 160 common foods; add anything it&apos;s
          missing.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {foods.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setEditing(f)}
                className="hover:bg-muted/50 flex w-full flex-col items-start px-3 py-2.5 text-left"
              >
                <span className="w-full truncate font-medium">{f.name}</span>
                <span className="text-muted-foreground text-xs">
                  {Math.round(f.kcal)} kcal · P {f.protein_g} · C {f.carbs_g} · F {f.fat_g} ·{" "}
                  {perLabel(f)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" className="self-start" onClick={() => setEditing(null)}>
        <Plus /> New food
      </Button>

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit food" : "New food"}</DialogTitle>
          </DialogHeader>
          {editing !== undefined && (
            <FoodForm
              key={editing?.id ?? "new"}
              food={editing ?? undefined}
              onCancel={() => setEditing(undefined)}
              onSaved={() => {
                toast.success(editing ? "Food saved" : "Food added");
                setEditing(undefined);
              }}
            />
          )}
          {editing && (
            <Button
              variant="destructive"
              className="self-start"
              disabled={pending}
              onClick={() => remove(editing)}
            >
              Delete this food
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
