"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { WEEKDAYS } from "@/lib/exercise-meta";
import { cn } from "@/lib/utils";
import { saveSchedule } from "./actions";

/** The week at a glance (Mon–Sun), and a dialog to choose a routine per day. */
export function WeekPlan({
  routines,
  plan,
  todayWeekday,
}: {
  routines: { id: string; name: string }[];
  /** Routine id per weekday, Monday first; null = rest. */
  plan: (string | null)[];
  todayWeekday: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(plan);
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string | null) => routines.find((r) => r.id === id)?.name;

  function save() {
    startTransition(async () => {
      const result = await saveSchedule(draft);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Weekly plan saved");
      setOpen(false);
    });
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">This week</h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={routines.length === 0}
          onClick={() => {
            setDraft(plan);
            setOpen(true);
          }}
        >
          <Pencil /> Edit plan
        </Button>
      </div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Weekly plan</DialogTitle>
          </DialogHeader>
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
