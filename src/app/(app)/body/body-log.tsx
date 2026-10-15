"use client";

import { useState, useTransition } from "react";
import { Plus, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MEASUREMENTS } from "@/lib/body";
import { relativeDay } from "@/lib/dates";
import { tapFeedback } from "@/lib/haptics";
import type { BodyMetric } from "@/lib/types";
import { saveMetrics } from "./actions";

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Today's weigh-in in one field and a tap, plus a dialog for the full set of measurements. */
export function WeighIn({
  today,
  todays,
  lastWeight,
}: {
  today: string;
  /** Today's row, if there is one. */
  todays: BodyMetric | null;
  lastWeight: number | null;
}) {
  const [weight, setWeight] = useState(str(todays?.weight_kg));
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const kg = num(weight);
    if (kg === null) return;
    startTransition(async () => {
      const r = await saveMetrics({ ...valuesOf(todays), date: today, weight_kg: kg });
      if (!r.ok) return void toast.error(r.error);
      tapFeedback();
      toast.success(`Weighed in at ${kg} kg`);
    });
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <form onSubmit={save} className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="weigh-in">Today&apos;s weight (kg)</Label>
          <Input
            id="weigh-in"
            type="number"
            inputMode="decimal"
            step="0.05"
            min={20}
            max={400}
            value={weight}
            placeholder={lastWeight ? String(lastWeight) : "e.g. 72.5"}
            onChange={(e) => setWeight(e.target.value)}
            className="text-lg tabular-nums"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending || num(weight) === null}>
          {pending ? "Saving…" : todays?.weight_kg ? "Update" : "Save"}
        </Button>
      </form>
      <p className="text-muted-foreground mt-2 text-xs">
        Weigh in the morning, after the bathroom and before eating, for numbers you can compare.
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setDetails(true)}>
        <Ruler /> Measurements
      </Button>
      <MetricsDialog
        open={details}
        onOpenChange={setDetails}
        metric={todays}
        date={today}
        today={today}
      />
    </div>
  );
}

function valuesOf(m: BodyMetric | null) {
  return {
    weight_kg: m?.weight_kg ?? null,
    body_fat_pct: m?.body_fat_pct ?? null,
    waist_cm: m?.waist_cm ?? null,
    chest_cm: m?.chest_cm ?? null,
    arms_cm: m?.arms_cm ?? null,
    hips_cm: m?.hips_cm ?? null,
    thighs_cm: m?.thighs_cm ?? null,
    notes: m?.notes ?? null,
  };
}

/** Weight, body fat, tape measurements and a note for one day. */
function MetricsDialog({
  open,
  onOpenChange,
  metric,
  date: initialDate,
  today,
  others = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: BodyMetric | null;
  date: string;
  today: string;
  /** Other days, so picking a date that has numbers shows them instead of wiping them. */
  others?: BodyMetric[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{metric ? relativeDay(metric.date, today) : "Measurements"}</DialogTitle>
        </DialogHeader>
        {open && (
          <MetricsForm
            key={metric?.id ?? initialDate}
            metric={metric}
            date={initialDate}
            today={today}
            others={others}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricsForm({
  metric,
  date: initialDate,
  today,
  others = [],
  onDone,
}: {
  metric: BodyMetric | null;
  date: string;
  today: string;
  others?: BodyMetric[];
  onDone: () => void;
}) {
  const start = metric ?? others.find((o) => o.date === initialDate) ?? null;
  const [date, setDate] = useState(start?.date ?? initialDate);
  const [weight, setWeight] = useState(str(start?.weight_kg));
  const [fat, setFat] = useState(str(start?.body_fat_pct));
  const [tape, setTape] = useState<Record<string, string>>(() =>
    Object.fromEntries(MEASUREMENTS.map((m) => [m.key, str(start?.[m.key])])),
  );
  const [notes, setNotes] = useState(start?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickDate(next: string) {
    setDate(next);
    const m = others.find((o) => o.date === next) ?? null;
    setWeight(str(m?.weight_kg));
    setFat(str(m?.body_fat_pct));
    setTape(Object.fromEntries(MEASUREMENTS.map((x) => [x.key, str(m?.[x.key])])));
    setNotes(m?.notes ?? "");
  }

  function save(values: Parameters<typeof saveMetrics>[0], message: string) {
    setError(null);
    startTransition(async () => {
      const r = await saveMetrics(values);
      if (!r.ok) return setError(r.error);
      toast.success(message);
      onDone();
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save(
      {
        date,
        weight_kg: num(weight),
        body_fat_pct: num(fat),
        waist_cm: num(tape.waist_cm),
        chest_cm: num(tape.chest_cm),
        arms_cm: num(tape.arms_cm),
        hips_cm: num(tape.hips_cm),
        thighs_cm: num(tape.thighs_cm),
        notes,
      },
      "Saved",
    );
  }

  function remove() {
    if (!metric || !confirm("Delete this day's numbers?")) return;
    save({ ...valuesOf(null), date: metric.date }, "Deleted");
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
      {!metric && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-date" className="text-xs">
            Date
          </Label>
          <Input
            id="m-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => pickDate(e.target.value)}
            required
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {box("m-weight", "Weight (kg)", weight, setWeight)}
        {box("m-fat", "Body fat (%)", fat, setFat)}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tape (cm)</legend>
        <div className="grid grid-cols-3 gap-3">
          {MEASUREMENTS.map((m) =>
            box(`m-${m.key}`, m.label, tape[m.key], (v) => setTape((t) => ({ ...t, [m.key]: v }))),
          )}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Waist at the navel, arms flexed at the widest point, same spot every time.
        </p>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="m-notes" className="text-xs">
          Notes
        </Label>
        <Textarea
          id="m-notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {metric && (
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
        <div className="flex-1" />
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

const PAGE = 15;

/** Every day with numbers, newest first. Tap one to change it. */
export function BodyHistory({ metrics, today }: { metrics: BodyMetric[]; today: string }) {
  const [editing, setEditing] = useState<BodyMetric | null>(null);
  const [adding, setAdding] = useState(false);
  const [all, setAll] = useState(false);
  const newest = [...metrics].reverse();
  const shown = all ? newest : newest.slice(0, PAGE);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">History</h2>
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
          <Plus /> Add a day
        </Button>
      </div>
      {newest.length === 0 ? (
        <p className="text-muted-foreground text-sm">Your weigh-ins show up here.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shown.map((m) => {
            const tape = MEASUREMENTS.filter((x) => m[x.key] != null).map(
              (x) => `${x.label} ${m[x.key]}`,
            );
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setEditing(m)}
                  className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{relativeDay(m.date, today)}</span>
                    {(tape.length > 0 || m.body_fat_pct != null || m.notes) && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {[m.body_fat_pct != null && `${m.body_fat_pct}% fat`, ...tape, m.notes]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums">
                    {m.weight_kg != null ? `${m.weight_kg} kg` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!all && newest.length > PAGE && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAll(true)}>
          Show all {newest.length}
        </Button>
      )}
      <MetricsDialog
        open={editing !== null || adding}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setAdding(false);
          }
        }}
        metric={editing}
        date={today}
        today={today}
        others={metrics}
      />
    </section>
  );
}
