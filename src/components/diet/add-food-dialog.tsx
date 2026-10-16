"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, Minus, Plus, Search, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import { FoodForm } from "@/components/diet/food-form";
import { tapFeedback } from "@/lib/haptics";
import {
  MEALS,
  amountStep,
  formatAmount,
  matchesFood,
  nutrientsFor,
  perLabel,
} from "@/lib/nutrition";
import type { Food, FoodUnit, Meal, MealEntry, MealIdea, Nutrients } from "@/lib/types";
import { ideaTotals, ideasForMeal, partnerPortion } from "@/lib/meal-ideas";
import { IdeaReview } from "@/components/diet/idea-review";
import { cn } from "@/lib/utils";
import {
  addEntry,
  deleteEntry,
  logIdea,
  quickAdd,
  setFavourite,
  updateEntry,
} from "@/app/(app)/diet/actions";

type View = "search" | "amount" | "quick" | "new" | "idea";
type Tab = "plan" | "recent" | "favourites" | "all";

const MAX_SHOWN = 60;

/** Find a food (or add your own, or just the numbers), choose how much, and log it. */
export function AddFoodDialog({
  open,
  onOpenChange,
  date,
  meal: initialMeal,
  foods: initialFoods,
  recentIds,
  favouriteIds,
  ideas = [],
  partner = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  meal: Meal;
  foods: Food[];
  recentIds: string[];
  favouriteIds: string[];
  /** Your meal ideas (saved combos, e.g. from a diet plan). */
  ideas?: MealIdea[];
  /** Your partner's ideas, to show their portion when you cook the same thing. */
  partner?: { name: string; ideas: MealIdea[] } | null;
}) {
  const [view, setView] = useState<View>("search");
  const [meal, setMeal] = useState(initialMeal);
  const [query, setQuery] = useState("");
  const defaultTab: Tab = ideas.length ? "plan" : recentIds.length ? "recent" : "all";
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [idea, setIdea] = useState<MealIdea | null>(null);
  const [foods, setFoods] = useState(initialFoods);
  const [favourites, setFavourites] = useState(() => new Set(favouriteIds));
  const [food, setFood] = useState<Food | null>(null);
  const [lastOpen, setLastOpen] = useState(open);

  // Each time the dialog opens: start at the search, on the meal that was tapped.
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setView("search");
      setMeal(initialMeal);
      setQuery("");
      setFoods(initialFoods);
      setTab(defaultTab);
    }
  }
  const orderedIdeas = useMemo(() => ideasForMeal(ideas, meal), [ideas, meal]);

  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const shown = useMemo(() => {
    if (query.trim()) {
      const hits = foods.filter((f) => matchesFood(f.name, query));
      // Favourites and recent foods first, then your own, then the rest by name.
      const rank = (f: Food) =>
        favourites.has(f.id) ? 0 : recentIds.includes(f.id) ? 1 : f.owner_id ? 2 : 3;
      return hits.sort((a, b) => rank(a) - rank(b)).slice(0, MAX_SHOWN);
    }
    if (tab === "recent") return recentIds.flatMap((id) => byId.get(id) ?? []);
    if (tab === "favourites") return [...favourites].flatMap((id) => byId.get(id) ?? []);
    return foods;
  }, [foods, byId, query, tab, favourites, recentIds]);

  function toggleFavourite(f: Food) {
    const on = !favourites.has(f.id);
    tapFeedback();
    setFavourites((s) => {
      const next = new Set(s);
      if (on) next.add(f.id);
      else next.delete(f.id);
      return next;
    });
    void setFavourite(f.id, on).then((r) => {
      if (!r.ok) toast.error(r.error);
    });
  }

  function choose(f: Food) {
    setFood(f);
    setView("amount");
  }

  function added(message: string) {
    tapFeedback();
    toast.success(message);
    setQuery("");
    setView("search");
  }

  const title =
    view === "quick"
      ? "Quick add"
      : view === "new"
        ? "New food"
        : view === "amount" && food
          ? food.name
          : view === "idea" && idea
            ? idea.name
            : `Add to ${MEALS.find((m) => m.value === meal)!.label.toLowerCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[88dvh] flex-col sm:max-w-md",
          view === "idea" && "overflow-y-auto",
        )}
      >
        <DialogHeader>
          <DialogTitle className="pr-6">{title}</DialogTitle>
        </DialogHeader>

        {view === "search" && (
          <>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods"
                className="pl-8"
                aria-label="Search foods"
              />
            </div>
            {!query.trim() && (
              <Segmented
                value={tab}
                onChange={setTab}
                aria-label="Show"
                options={[
                  ...(ideas.length ? [{ value: "plan" as const, label: "Plan" }] : []),
                  { value: "recent", label: "Recent" },
                  { value: "favourites", label: "Starred" },
                  { value: "all", label: "All" },
                ]}
              />
            )}
            {tab === "plan" && !query.trim() ? (
              <ul className="-mx-1 min-h-40 flex-1 overflow-y-auto">
                {orderedIdeas.map((x, i) => {
                  const t = ideaTotals(x.items, byId);
                  const header =
                    (i === 0 || orderedIdeas[i - 1].meal !== x.meal) &&
                    MEALS.find((m) => m.value === x.meal)!.label;
                  return (
                    <li key={x.id}>
                      {header && (
                        <p className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium uppercase">
                          {header}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIdea(x);
                          setView("idea");
                        }}
                        className="hover:bg-muted flex w-full flex-col items-start rounded-md px-2 py-2 text-left"
                      >
                        <span className="w-full truncate font-medium">{x.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {t.kcal} kcal · {Math.round(t.protein_g)} g protein
                          {x.hint && ` · ${x.hint}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="-mx-1 min-h-40 flex-1 overflow-y-auto">
                {shown.map((f) => (
                  <li key={f.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => choose(f)}
                      className="hover:bg-muted flex min-w-0 flex-1 flex-col items-start rounded-md px-2 py-2 text-left"
                    >
                      <span className="w-full truncate font-medium">{f.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {Math.round(f.kcal)} kcal · {f.protein_g} g protein · {perLabel(f)}
                        {f.owner_id && " · custom"}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        favourites.has(f.id) ? "Remove from favourites" : "Add to favourites"
                      }
                      aria-pressed={favourites.has(f.id)}
                      onClick={() => toggleFavourite(f)}
                    >
                      <Star
                        className={cn(favourites.has(f.id) && "fill-amber-400 text-amber-500")}
                      />
                    </Button>
                  </li>
                ))}
                {shown.length === 0 && (
                  <li className="text-muted-foreground px-2 py-6 text-center text-sm">
                    {query.trim()
                      ? "Nothing matches. Add it as a new food, or quick add the calories."
                      : tab === "recent"
                        ? "Foods you log show up here."
                        : "Tap the star on a food to keep it here."}
                  </li>
                )}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setView("quick")}>
                <Zap /> Quick add
              </Button>
              <Button type="button" variant="outline" onClick={() => setView("new")}>
                <Plus /> New food
              </Button>
            </div>
          </>
        )}

        {view === "amount" && food && (
          <AmountForm
            key={food.id}
            unit={food.unit}
            serving={food.serving}
            subtitle={perLabel(food)}
            initialAmount={food.default_amount}
            meal={meal}
            onMealChange={setMeal}
            nutrients={(amount) => nutrientsFor(food, amount)}
            submitLabel="Add"
            onBack={() => setView("search")}
            onSubmit={async (amount) => {
              const r = await addEntry({ date, meal, food_id: food.id, amount });
              if (!r.ok) return r.error;
              added(`Added ${formatAmount(amount, food.unit, food.serving)} of ${food.name}`);
            }}
          />
        )}

        {view === "idea" && idea && (
          <IdeaReview
            key={idea.id}
            idea={idea}
            foods={byId}
            meal={meal}
            onMealChange={setMeal}
            partner={
              partner ? { name: partner.name, items: partnerPortion(idea, partner.ideas) } : null
            }
            onBack={() => setView("search")}
            onSubmit={async (items) => {
              const r = await logIdea(date, meal, items);
              if (!r.ok) return r.error;
              added(`Added ${idea.name.toLowerCase()} (${r.count} foods)`);
            }}
          />
        )}

        {view === "quick" && (
          <QuickAddForm
            initialName={query}
            meal={meal}
            onMealChange={setMeal}
            onBack={() => setView("search")}
            onSubmit={async (values) => {
              const r = await quickAdd({ date, meal, ...values });
              if (!r.ok) return r.error;
              added(`Added ${values.kcal} kcal`);
            }}
          />
        )}

        {view === "new" && (
          <div className="-mx-1 min-h-0 overflow-y-auto px-1">
            <FoodForm
              initialName={query}
              cancelLabel="Back"
              onCancel={() => setView("search")}
              onSaved={(f) => {
                setFoods((fs) => [...fs, f].sort((a, b) => a.name.localeCompare(b.name)));
                choose(f);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Meal</Label>
      <Segmented
        value={value}
        onChange={onChange}
        aria-label="Meal"
        options={MEALS.map((m) => ({
          value: m.value,
          label: <span className="max-[359px]:text-xs">{m.label}</span>,
        }))}
      />
    </div>
  );
}

function NutrientPreview({ n }: { n: Nutrients }) {
  return (
    <div className="bg-muted/60 grid grid-cols-4 gap-1 rounded-lg p-3 text-center">
      {[
        ["kcal", Math.round(n.kcal)],
        ["Protein", `${n.protein_g} g`],
        ["Carbs", `${n.carbs_g} g`],
        ["Fat", `${n.fat_g} g`],
      ].map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="font-heading truncate text-lg font-semibold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      ))}
    </div>
  );
}

const CHIPS: Record<FoodUnit, number[]> = {
  piece: [0.5, 1, 2, 3, 4],
  g: [50, 100, 150, 200, 250],
  ml: [100, 200, 250, 300, 500],
};

/** How much, which meal, and what that comes to. */
function AmountForm({
  unit,
  serving,
  subtitle,
  initialAmount,
  meal,
  onMealChange,
  nutrients,
  submitLabel,
  onBack,
  backLabel = "Back",
  onSubmit,
  onDelete,
}: {
  unit: FoodUnit;
  serving: string | null;
  subtitle: string;
  initialAmount: number;
  meal: Meal;
  onMealChange: (m: Meal) => void;
  nutrients: (amount: number) => Nutrients;
  submitLabel: string;
  onBack: () => void;
  backLabel?: string;
  /** Returns an error message, or nothing when it worked. */
  onSubmit: (amount: number) => Promise<string | void>;
  onDelete?: () => void;
}) {
  const [text, setText] = useState(String(initialAmount));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const amount = Number(text) > 0 ? Number(text) : 0;
  const step = amountStep(unit);
  const unitLabel =
    unit === "piece"
      ? formatAmount(amount === 1 ? 1 : 2, unit, serving).replace(/^\S+ /, "")
      : unit;

  function bump(by: number) {
    tapFeedback();
    setText(String(Math.max(step, Math.round((amount + by) * 100) / 100)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amount) return setError("Enter how much");
    startTransition(async () => {
      const failed = await onSubmit(amount);
      if (failed) setError(failed);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-muted-foreground -mt-2 text-sm">Values {subtitle}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="food-amount">How much</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Less"
            onClick={() => bump(-step)}
          >
            <Minus />
          </Button>
          <Input
            id="food-amount"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="h-9 text-center text-lg font-semibold tabular-nums"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="More"
            onClick={() => bump(step)}
          >
            <Plus />
          </Button>
          <span className="text-muted-foreground w-16 shrink-0 truncate text-sm">{unitLabel}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CHIPS[unit].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setText(String(n))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs tabular-nums",
                amount === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted",
              )}
            >
              {n === 0.5 ? "½" : n}
              {unit === "piece" ? "" : ` ${unit}`}
            </button>
          ))}
        </div>
      </div>

      <MealPicker value={meal} onChange={onMealChange} />
      <NutrientPreview n={nutrients(amount)} />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={pending}>
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={onBack}>
          {!onDelete && <ChevronLeft />} {backLabel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function QuickAddForm({
  initialName,
  meal,
  onMealChange,
  onBack,
  onSubmit,
}: {
  initialName: string;
  meal: Meal;
  onMealChange: (m: Meal) => void;
  onBack: () => void;
  onSubmit: (values: {
    name: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => Promise<string | void>;
}) {
  const [name, setName] = useState(initialName);
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const failed = await onSubmit({
        name,
        kcal: Math.round(num(kcal)),
        protein_g: num(protein),
        carbs_g: num(carbs),
        fat_g: num(fat),
      });
      if (failed) setError(failed);
    });
  }

  const box = (id: string, label: string, value: string, set: (v: string) => void) => (
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
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-muted-foreground -mt-2 text-sm">
        Just the numbers, for a restaurant meal or something off a label.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-name">What was it? (optional)</Label>
        <Input
          id="quick-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Wedding lunch"
          maxLength={80}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {box("quick-kcal", "Calories (kcal)", kcal, setKcal)}
        {box("quick-protein", "Protein (g)", protein, setProtein)}
        {box("quick-carbs", "Carbs (g)", carbs, setCarbs)}
        {box("quick-fat", "Fat (g)", fat, setFat)}
      </div>
      <MealPicker value={meal} onChange={onMealChange} />
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft /> Back
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add"}
        </Button>
      </div>
    </form>
  );
}

/** Change how much of something you had, move it to another meal, or delete it. */
export function EditEntryDialog({
  entry,
  onOpenChange,
}: {
  entry: MealEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? "breakfast");
  const [lastId, setLastId] = useState(entry?.id);
  const [pending, startTransition] = useTransition();
  if (entry && entry.id !== lastId) {
    setLastId(entry.id);
    setMeal(entry.meal);
  }

  function remove() {
    if (!entry) return;
    startTransition(async () => {
      const r = await deleteEntry(entry.id);
      if (!r.ok) return void toast.error(r.error);
      tapFeedback();
      toast.success(`Removed ${entry.name}`);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{entry?.name}</DialogTitle>
        </DialogHeader>
        {entry &&
          (entry.unit ? (
            <AmountForm
              key={entry.id}
              unit={entry.unit}
              serving={entry.serving}
              subtitle={`logged as ${formatAmount(entry.amount, entry.unit, entry.serving)}`}
              initialAmount={entry.amount}
              meal={meal}
              onMealChange={setMeal}
              nutrients={(amount) => scaled(entry, amount)}
              submitLabel="Save"
              backLabel="Cancel"
              onBack={() => onOpenChange(false)}
              onDelete={remove}
              onSubmit={async (amount) => {
                const r = await updateEntry(entry.id, { meal, amount });
                if (!r.ok) return r.error;
                onOpenChange(false);
              }}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <NutrientPreview n={entry} />
              <MealPicker value={meal} onChange={setMeal} />
              <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={remove} disabled={pending}>
                  Delete
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={pending || meal === entry.meal}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await updateEntry(entry.id, { meal, amount: entry.amount });
                      if (!r.ok) return void toast.error(r.error);
                      onOpenChange(false);
                    })
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
      </DialogContent>
    </Dialog>
  );
}

/** An entry's nutrition at a different amount (the same sum the server does). */
function scaled(entry: MealEntry, amount: number): Nutrients {
  const f = amount / entry.amount;
  const r = (n: number) => Math.round(n * f * 10) / 10;
  return {
    kcal: Math.round(entry.kcal * f),
    protein_g: r(entry.protein_g),
    carbs_g: r(entry.carbs_g),
    fat_g: r(entry.fat_g),
    fibre_g: r(entry.fibre_g),
  };
}
