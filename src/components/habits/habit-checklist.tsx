"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatProgress, isMet } from "@/lib/habits";
import { tapFeedback } from "@/lib/haptics";
import type { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { setHabitValue } from "@/app/(app)/habits/actions";

/** Today's habits: tap to tick, or enter a number for steps and sleep. Streaks alongside. */
export function HabitChecklist({
  date,
  habits,
  values,
  streaks,
}: {
  date: string;
  habits: Habit[];
  values: Record<string, number>;
  streaks: Record<string, number>;
}) {
  const [shown, setShown] = useOptimistic(
    values,
    (current, next: { id: string; value: number | null }) => {
      const copy = { ...current };
      if (next.value) copy[next.id] = next.value;
      else delete copy[next.id];
      return copy;
    },
  );
  const [, startTransition] = useTransition();
  const [entering, setEntering] = useState<Habit | null>(null);

  function save(habit: Habit, value: number | null) {
    tapFeedback();
    startTransition(async () => {
      setShown({ id: habit.id, value });
      const r = await setHabitValue(habit.id, date, value);
      if (!r.ok) toast.error(r.error);
    });
  }

  if (habits.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        No habits yet.{" "}
        <Link href="/habits" className="underline">
          Add some
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <ul className="bg-card divide-y rounded-xl border">
        {habits.map((h) => {
          const value = shown[h.id];
          const met = isMet(h, value);
          // A streak only counts today once it's met; show it as it will be.
          const days =
            (streaks[h.id] ?? 0) +
            (met && !isMet(h, values[h.id]) ? 1 : 0) -
            (!met && isMet(h, values[h.id]) ? 1 : 0);
          return (
            <li key={h.id}>
              <button
                type="button"
                aria-pressed={h.kind === "check" ? met : undefined}
                onClick={() => (h.kind === "check" ? save(h, met ? null : 1) : setEntering(h))}
                className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className="text-xl" aria-hidden>
                  {h.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn("block truncate font-medium", met && "text-muted-foreground")}
                  >
                    {h.name}
                  </span>
                  {h.kind === "number" && (
                    <span className="text-muted-foreground block text-xs tabular-nums">
                      {formatProgress(value ?? 0, h)}
                    </span>
                  )}
                </span>
                {days > 1 && (
                  <span className="text-muted-foreground text-sm tabular-nums" title="Streak">
                    🔥 {days}
                  </span>
                )}
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    met ? "border-green-600 bg-green-600 text-white" : "border-muted-foreground/40",
                  )}
                >
                  {met && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <NumberDialog
        habit={entering}
        value={entering ? shown[entering.id] : undefined}
        onClose={() => setEntering(null)}
        onSave={(h, v) => {
          setEntering(null);
          save(h, v);
        }}
      />
    </>
  );
}

function NumberDialog({
  habit,
  value,
  onClose,
  onSave,
}: {
  habit: Habit | null;
  value: number | undefined;
  onClose: () => void;
  onSave: (habit: Habit, value: number | null) => void;
}) {
  const [text, setText] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if ((habit?.id ?? null) !== lastId) {
    setLastId(habit?.id ?? null);
    setText(value ? String(value) : "");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!habit) return;
    const n = Number(text);
    onSave(habit, text.trim() === "" || !(n > 0) ? null : n);
  }

  return (
    <Dialog open={habit !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {habit?.emoji} {habit?.name}
          </DialogTitle>
        </DialogHeader>
        {habit && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="habit-value">
                Today{habit.unit ? ` (${habit.unit})` : ""}
                {habit.target && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · target {habit.target.toLocaleString("en-IN")}
                  </span>
                )}
              </Label>
              <Input
                id="habit-value"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                className="text-lg tabular-nums"
              />
            </div>
            <div className="flex items-center gap-2">
              {habit.target && (
                <Button type="button" variant="outline" onClick={() => onSave(habit, habit.target)}>
                  Hit target
                </Button>
              )}
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
