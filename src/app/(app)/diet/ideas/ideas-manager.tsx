"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/segmented";
import { FoodSearch } from "@/components/diet/food-search";
import { ideaTotals, itemLabel } from "@/lib/meal-ideas";
import { MEALS } from "@/lib/nutrition";
import type { Food, Meal, MealIdea } from "@/lib/types";
import { deleteIdea, saveIdea, saveMealAsIdea } from "../actions";

type Draft = {
  meal: Meal;
  name: string;
  hint: string;
  note: string;
  items: { food_id: string; amount: string; optional: boolean }[];
};

const draftOf = (idea: MealIdea | null, meal: Meal = "breakfast"): Draft => ({
  meal: idea?.meal ?? meal,
  name: idea?.name ?? "",
  hint: idea?.hint ?? "",
  note: idea?.note ?? "",
  items:
    idea?.items.map((i) => ({
      food_id: i.food_id,
      amount: String(i.amount),
      optional: i.optional,
    })) ?? [],
});

/** Your meal ideas by meal: add, edit, copy or delete. Your partner's are read-only. */
export function IdeasManager({
  mine,
  theirs,
  partnerName,
  foods,
  today,
}: {
  mine: MealIdea[];
  theirs: MealIdea[];
  partnerName: string | null;
  foods: Food[];
  today: string;
}) {
  const [whose, setWhose] = useState<"mine" | "theirs">("mine");
  // undefined = closed; { id: null } = a new idea.
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | undefined>();
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const ideas = whose === "mine" ? mine : theirs;
  const readOnly = whose === "theirs";

  function remove(idea: MealIdea) {
    if (!confirm(`Delete "${idea.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteIdea(idea.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Idea deleted");
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {partnerName && (
          <Segmented
            value={whose}
            onChange={setWhose}
            aria-label="Whose ideas"
            className="w-56"
            options={[
              { value: "mine", label: "Mine" },
              { value: "theirs", label: partnerName },
            ]}
          />
        )}
        {!readOnly && (
          <>
            <Button size="sm" onClick={() => setEditing({ id: null, draft: draftOf(null) })}>
              <Plus /> New idea
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSaving(true)}>
              <Save /> Save a meal I ate
            </Button>
          </>
        )}
      </div>

      {MEALS.map((m) => {
        const list = ideas.filter((i) => i.meal === m.value);
        if (list.length === 0) return null;
        return (
          <section key={m.value}>
            <h2 className="mb-2 text-sm font-semibold">{m.label}</h2>
            <ul className="divide-y rounded-xl border">
              {list.map((idea) => {
                const t = ideaTotals(idea.items, byId);
                return (
                  <li key={idea.id} className="flex items-start gap-2 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{idea.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {t.kcal} kcal · {Math.round(t.protein_g)} g protein
                        {idea.hint && ` · ${idea.hint}`}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {idea.items
                          .flatMap((it) => {
                            const f = byId.get(it.food_id);
                            if (!f) return [];
                            return [
                              `${itemLabel(f, it.amount)}${it.optional ? " (optional)" : ""}`,
                            ];
                          })
                          .join(" · ")}
                      </p>
                      {idea.note && <p className="mt-1 text-xs italic">{idea.note}</p>}
                    </div>
                    <div className="flex shrink-0">
                      {readOnly ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Copy ${idea.name} to my ideas`}
                          onClick={() =>
                            setEditing({
                              id: null,
                              draft: { ...draftOf(idea), name: idea.name },
                            })
                          }
                        >
                          <Copy />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${idea.name}`}
                            onClick={() => setEditing({ id: idea.id, draft: draftOf(idea) })}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Copy ${idea.name}`}
                            onClick={() =>
                              setEditing({
                                id: null,
                                draft: { ...draftOf(idea), name: `${idea.name} (copy)` },
                              })
                            }
                          >
                            <Copy />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${idea.name}`}
                            disabled={pending}
                            onClick={() => remove(idea)}
                          >
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {ideas.length === 0 && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          {readOnly
            ? "No ideas yet."
            : "No meal ideas yet. Save a meal you eat often, and add it again in one tap."}
        </p>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit idea" : "New idea"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <IdeaForm
              key={editing.id ?? "new"}
              id={editing.id}
              initial={editing.draft}
              foods={foods}
              byId={byId}
              onDone={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>

      <SaveMealDialog open={saving} onOpenChange={setSaving} today={today} />
    </div>
  );
}

function IdeaForm({
  id,
  initial,
  foods,
  byId,
  onDone,
}: {
  id: string | null;
  initial: Draft;
  foods: Food[];
  byId: Map<string, Food>;
  onDone: () => void;
}) {
  const [d, setD] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const setItem = (i: number, patch: Partial<Draft["items"][number]>) =>
    set({ items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const total = ideaTotals(
    d.items.map((it) => ({ ...it, amount: Number(it.amount) || 0 })),
    byId,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await saveIdea(
        {
          meal: d.meal,
          name: d.name,
          hint: d.hint,
          note: d.note,
          items: d.items.map((it) => ({
            food_id: it.food_id,
            amount: Number(it.amount),
            optional: it.optional,
          })),
        },
        id ?? undefined,
      );
      if (!r.ok) return setError(r.error);
      toast.success(id ? "Idea saved" : "Idea added");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="idea-name">Name</Label>
        <Input
          id="idea-name"
          value={d.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Puttu, eggs and kadala"
          maxLength={60}
          required
        />
      </div>
      <Segmented
        value={d.meal}
        onChange={(meal) => set({ meal })}
        aria-label="Meal"
        options={MEALS.map((m) => ({
          value: m.value,
          label: <span className="max-[359px]:text-xs">{m.label}</span>,
        }))}
      />
      <div className="flex flex-col gap-2">
        <Label>Foods</Label>
        {d.items.length === 0 && (
          <p className="text-muted-foreground text-sm">Search below to add foods.</p>
        )}
        <ul className="divide-y rounded-md border empty:hidden">
          {d.items.map((it, i) => {
            const f = byId.get(it.food_id);
            return (
              <li key={i} className="flex items-center gap-2 px-2 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{f?.name ?? "Food"}</span>
                  <label className="text-muted-foreground flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={it.optional}
                      onChange={(e) => setItem(i, { optional: e.target.checked })}
                      className="accent-green-600"
                    />
                    Optional
                  </label>
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={it.amount}
                  onChange={(e) => setItem(i, { amount: e.target.value })}
                  aria-label={`${f?.name ?? "Food"} amount`}
                  className="h-8 w-20 text-right tabular-nums"
                />
                <span className="text-muted-foreground w-10 text-xs">
                  {f ? (f.unit === "piece" ? (f.serving ?? "pc") : f.unit) : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove"
                  onClick={() => set({ items: d.items.filter((_, j) => j !== i) })}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
        <FoodSearch
          foods={foods}
          onPick={(f) =>
            set({
              items: [
                ...d.items,
                { food_id: f.id, amount: String(f.default_amount), optional: false },
              ],
            })
          }
        />
        {d.items.length > 0 && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {total.kcal} kcal · {Math.round(total.protein_g)} g protein (without optional foods)
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="idea-hint" className="text-xs">
            When (optional)
          </Label>
          <Input
            id="idea-hint"
            value={d.hint}
            onChange={(e) => set({ hint: e.target.value })}
            placeholder="11 AM, Pre-workout"
            maxLength={30}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="idea-note" className="text-xs">
          Note (optional)
        </Label>
        <Textarea
          id="idea-note"
          rows={2}
          maxLength={300}
          value={d.note}
          onChange={(e) => set({ note: e.target.value })}
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function SaveMealDialog({
  open,
  onOpenChange,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
}) {
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState<Meal>("lunch");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await saveMealAsIdea(date, meal, name);
      if (!r.ok) return setError(r.error);
      toast.success("Saved as an idea");
      setName("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save a meal you ate</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-muted-foreground -mt-2 text-sm">
            Everything you logged for that meal becomes one idea you can add again.
          </p>
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Day"
            required
          />
          <Segmented
            value={meal}
            onChange={setMeal}
            aria-label="Meal"
            options={MEALS.map((m) => ({
              value: m.value,
              label: <span className="max-[359px]:text-xs">{m.label}</span>,
            }))}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. Sunday biryani"
            aria-label="Name"
            maxLength={60}
            required
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save idea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
