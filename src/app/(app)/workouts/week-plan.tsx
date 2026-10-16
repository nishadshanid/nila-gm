"use client";

import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { Segmented } from "@/components/segmented";
import { WEEKDAYS } from "@/lib/exercise-meta";
import type { WeekProgress } from "@/lib/workout";
import { cn } from "@/lib/utils";
import { saveSchedule, saveWeeklyGoal } from "./actions";

type Mode = "flexible" | "fixed";

/**
 * The week at a glance: in a flexible programme, one box per workout of the
 * goal; with fixed days, Mon–Sun with each day's routine. The dialog switches
 * between the two.
 */
export function WeekPlan({
  routines,
  plan,
  todayWeekday,
  goal,
  week,
}: {
  routines: { id: string; name: string }[];
  /** Routine id per weekday, Monday first; null = rest. */
  plan: (string | null)[];
  todayWeekday: number;
  /** Workouts a week in a flexible programme, or null for fixed days. */
  goal: number | null;
  week: WeekProgress | null;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(goal ? "flexible" : "fixed");
  const [draftGoal, setDraftGoal] = useState(goal ?? 5);
  const [draft, setDraft] = useState(plan);
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string | null) => routines.find((r) => r.id === id)?.name;

  function save() {
    startTransition(async () => {
      const result =
        mode === "flexible" ? await saveWeeklyGoal(draftGoal) : await saveSchedule(draft);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Plan saved");
      setOpen(false);
    });
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          This week
          {goal && week && (
            <span className="text-muted-foreground ml-2 font-normal">
              {week.done} of {goal}
              {week.left === 0 ? ", goal reached" : ""}
            </span>
          )}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={routines.length === 0}
          onClick={() => {
            setMode(goal ? "flexible" : "fixed");
            setDraftGoal(goal ?? 5);
            setDraft(plan);
            setOpen(true);
          }}
        >
          <Pencil /> Edit plan
        </Button>
      </div>

      {goal && week ? (
        <div className="bg-card rounded-xl border p-3">
          <ol className="flex gap-1.5" aria-label={`${week.done} of ${goal} workouts this week`}>
            {Array.from({ length: Math.max(goal, week.done) }, (_, i) => (
              <li
                key={i}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center rounded-md border text-sm",
                  i < week.done
                    ? "border-green-600 bg-green-600 text-white"
                    : "text-muted-foreground border-dashed",
                )}
              >
                {i < week.done && <Check className="size-4" strokeWidth={3} />}
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-2 text-xs">
            {week.left === 0
              ? "All done. Rest up, or add a bonus session."
              : `${week.left} to go, ${week.daysLeft} day${week.daysLeft === 1 ? "" : "s"} left. Any days you like.`}
          </p>
        </div>
      ) : (
        <ol className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day, i) => {
            const name = nameOf(plan[i]);
            return (
              <li
                key={day}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-lg border px-0.5 py-2 text-center",
                  i + 1 === todayWeekday && "border-foreground/40 bg-muted",
                  !name && "text-muted-foreground",
                )}
              >
                <span className="text-[0.7rem] font-medium uppercase">{day}</span>
                <span className="w-full truncate text-xs font-semibold">{name ?? "Rest"}</span>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Weekly plan</DialogTitle>
          </DialogHeader>
          <Segmented
            value={mode}
            onChange={setMode}
            aria-label="Plan type"
            options={[
              { value: "flexible", label: "Any days" },
              { value: "fixed", label: "Fixed days" },
            ]}
          />
          {mode === "flexible" ? (
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex items-center gap-3">
                <span className="flex-1 font-medium">Workouts a week</span>
                <NativeSelect
                  className="w-20"
                  value={draftGoal}
                  onChange={(e) => setDraftGoal(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <p className="text-muted-foreground">
                Go on any days you like. Your routines go round in a cycle: after each one, the next
                comes up. Change it any time from the workout card.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {WEEKDAYS.map((day, i) => (
                <label key={day} className="flex items-center gap-3 text-sm">
                  <span className="w-10 font-medium">{day}</span>
                  <NativeSelect
                    className="flex-1"
                    value={draft[i] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => d.map((v, j) => (j === i ? e.target.value || null : v)))
                    }
                  >
                    <option value="">Rest</option>
                    {routines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
