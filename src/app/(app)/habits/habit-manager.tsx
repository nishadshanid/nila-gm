"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import type { Habit, HabitKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addStarterHabits, deleteHabit, moveHabit, saveHabit } from "./actions";

const EMOJIS = [
  "✅",
  "🚶",
  "💊",
  "😴",
  "🍊",
  "🚫",
  "🧘",
  "📖",
  "🥗",
  "🍎",
  "🧴",
  "☀️",
  "🏃",
  "🦷",
  "📵",
];

/** Your habits with the last 7 days at a glance; add, edit, reorder or delete them. */
export function HabitManager({
  habits,
  week,
  weekLabels,
}: {
  habits: Habit[];
  week: Record<string, boolean[]>;
  /** Day names for the last 7 days, oldest first. */
  weekLabels: string[];
}) {
  // undefined = closed, null = new habit.
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) return void toast.error(r.error);
      if (done) toast.success(done);
    });
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your habits</h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
          <Plus /> New habit
        </Button>
      </div>
      {habits.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center text-sm">
          No habits yet.
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(addStarterHabits, "Added 5 habits")}
          >
            Add steps, creatine, sleep, vitamins and no sugar
          </Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-2 text-xs">
            Dots show the last 7 days, today on the right.
          </p>
          <ul className="divide-y rounded-xl border">
            {habits.map((h, i) => (
              <li key={h.id} className="flex items-center gap-2 px-3 py-2">
                <span aria-hidden>{h.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{h.name}</span>
                  <span
                    className="mt-1 flex gap-1"
                    aria-label={`Met on ${week[h.id]?.filter(Boolean).length ?? 0} of the last 7 days`}
                  >
                    {(week[h.id] ?? []).map((met, d) => (
                      <span
                        key={d}
                        title={weekLabels[d]}
                        className={cn("size-2.5 rounded-full", met ? "bg-green-600" : "bg-muted")}
                      />
                    ))}
                  </span>
                </span>
                <span className="flex">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={pending || i === 0}
                    onClick={() => run(() => moveHabit(h.id, -1))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={pending || i === habits.length - 1}
                    onClick={() => run(() => moveHabit(h.id, 1))}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${h.name}`}
                    onClick={() => setEditing(h)}
                  >
                    <Pencil />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit habit" : "New habit"}</DialogTitle>
          </DialogHeader>
          {editing !== undefined && (
            <HabitForm
              key={editing?.id ?? "new"}
              habit={editing ?? undefined}
              onDone={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function HabitForm({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const [name, setName] = useState(habit?.name ?? "");
  const [emoji, setEmoji] = useState(habit?.emoji ?? "✅");
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? "check");
  const [target, setTarget] = useState(habit?.target ? String(habit.target) : "");
  const [unit, setUnit] = useState(habit?.unit ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await saveHabit(
        {
          name,
          emoji,
          kind,
          target: kind === "number" && target.trim() ? Number(target) : null,
          unit: kind === "number" ? unit : null,
        },
        habit?.id,
      );
      if (!r.ok) return setError(r.error);
      toast.success(habit ? "Habit saved" : "Habit added");
      onDone();
    });
  }

  function remove() {
    if (!habit || !confirm(`Delete "${habit.name}" and its history?`)) return;
    startTransition(async () => {
      const r = await deleteHabit(habit.id);
      if (!r.ok) return setError(r.error);
      toast.success("Habit deleted");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="habit-name">Name</Label>
        <Input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Stretch, Read 10 pages"
          maxLength={40}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={e}
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border text-lg",
                emoji === e ? "border-primary bg-muted" : "hover:bg-muted border-transparent",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Track it as</Label>
        <Segmented
          value={kind}
          onChange={setKind}
          aria-label="Track it as"
          options={[
            { value: "check", label: "Done or not" },
            { value: "number", label: "A number" },
          ]}
        />
      </div>
      {kind === "number" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-target" className="text-xs">
              Daily target
            </Label>
            <Input
              id="habit-target"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-unit" className="text-xs">
              Unit
            </Label>
            <Input
              id="habit-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="steps, h, pages"
              maxLength={12}
            />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {habit && (
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : habit ? "Save" : "Add habit"}
        </Button>
      </div>
    </form>
  );
}
