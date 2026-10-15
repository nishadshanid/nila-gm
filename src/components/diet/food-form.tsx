"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import type { Food, FoodUnit } from "@/lib/types";
import { saveFood } from "@/app/(app)/diet/actions";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
const str = (n: number | undefined) => (n === undefined ? "" : String(n));

/** Create or edit one of your own foods. Values come off the pack's nutrition label. */
export function FoodForm({
  food,
  initialName = "",
  onSaved,
  onCancel,
  cancelLabel = "Cancel",
}: {
  food?: Food;
  initialName?: string;
  onSaved: (food: Food) => void;
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const [name, setName] = useState(food?.name ?? initialName);
  const [unit, setUnit] = useState<FoodUnit>(food?.unit ?? "g");
  const [serving, setServing] = useState(food?.serving ?? "");
  const [defaultAmount, setDefaultAmount] = useState(str(food?.default_amount ?? 100));
  const [kcal, setKcal] = useState(str(food?.kcal));
  const [protein, setProtein] = useState(str(food?.protein_g));
  const [carbs, setCarbs] = useState(str(food?.carbs_g));
  const [fat, setFat] = useState(str(food?.fat_g));
  const [fibre, setFibre] = useState(str(food?.fibre_g));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeUnit(next: FoodUnit) {
    setUnit(next);
    // A sensible starting amount for the new unit, unless one was typed.
    if (next === "piece" && num(defaultAmount) >= 10) setDefaultAmount("1");
    if (next !== "piece" && num(defaultAmount) < 10) setDefaultAmount("100");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (kcal.trim() === "") return setError("Enter the calories");
    startTransition(async () => {
      const result = await saveFood(
        {
          name,
          unit,
          serving: unit === "piece" ? serving : null,
          default_amount: num(defaultAmount),
          kcal: num(kcal),
          protein_g: num(protein),
          carbs_g: num(carbs),
          fat_g: num(fat),
          fibre_g: num(fibre),
        },
        food?.id,
      );
      if (!result.ok) return setError(result.error);
      onSaved(result.food);
    });
  }

  const per = unit === "piece" ? `per ${serving.trim() || "piece"}` : `per 100 ${unit}`;
  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    required = false,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        min={0}
        value={value}
        onChange={(e) => set(e.target.value)}
        required={required}
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="food-name">Name</Label>
        <Input
          id="food-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Amma's chicken curry, MuscleBlaze whey"
          maxLength={80}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Values are</Label>
        <Segmented
          value={unit}
          onChange={changeUnit}
          aria-label="Values are"
          options={[
            { value: "g", label: "Per 100 g" },
            { value: "ml", label: "Per 100 ml" },
            { value: "piece", label: "Per piece" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {unit === "piece" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="food-serving" className="text-xs">
              One piece is a
            </Label>
            <Input
              id="food-serving"
              value={serving}
              onChange={(e) => setServing(e.target.value)}
              placeholder="scoop, bar, roti"
              maxLength={30}
            />
          </div>
        )}
        {field(
          "food-default",
          unit === "piece" ? "Usual number" : `Usual amount (${unit})`,
          defaultAmount,
          setDefaultAmount,
          true,
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Nutrition {per}</legend>
        <div className="grid grid-cols-2 gap-3">
          {field("food-kcal", "Calories (kcal)", kcal, setKcal, true)}
          {field("food-protein", "Protein (g)", protein, setProtein)}
          {field("food-carbs", "Carbs (g)", carbs, setCarbs)}
          {field("food-fat", "Fat (g)", fat, setFat)}
          {field("food-fibre", "Fibre (g)", fibre, setFibre)}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : food ? "Save" : "Add food"}
        </Button>
      </div>
    </form>
  );
}
