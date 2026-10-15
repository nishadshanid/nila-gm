"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Flame, Settings2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import { formatMl } from "@/lib/habits";
import { tapFeedback } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { addWater, saveWaterSettings, undoWater } from "@/app/(app)/habits/actions";

const GLASS_SIZES = ["200", "250", "300", "500"] as const;

/** One tap per glass, a row of glasses filling up, and undo for a mis-tap. */
export function WaterCard({
  date,
  ml,
  target,
  glassMl,
  streak,
}: {
  date: string;
  ml: number;
  target: number;
  glassMl: number;
  streak: number;
}) {
  const [shown, change] = useOptimistic(ml, (current, by: number) => Math.max(0, current + by));
  const [, startTransition] = useTransition();
  const [settings, setSettings] = useState(false);
  const glasses = Math.max(1, Math.ceil(target / glassMl));
  const full = Math.floor(shown / glassMl);
  const done = shown >= target;

  function add() {
    tapFeedback();
    startTransition(async () => {
      change(glassMl);
      const r = await addWater(date, glassMl);
      if (!r.ok) toast.error(r.error);
      else if (shown < target && shown + glassMl >= target) toast.success("Water target hit");
    });
  }

  function undo() {
    tapFeedback();
    startTransition(async () => {
      change(-glassMl);
      const r = await undoWater(date);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            Water
            {streak > 1 && (
              <span className="text-muted-foreground ml-2 inline-flex items-center gap-0.5 text-sm font-normal">
                <Flame className="size-3.5 text-orange-500" />
                {streak}
              </span>
            )}
          </p>
          <p className="text-muted-foreground text-sm tabular-nums">
            {formatMl(shown)} of {formatMl(target)}
            {done && " · done"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Undo last glass"
          disabled={shown === 0}
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Water settings"
          onClick={() => setSettings(true)}
        >
          <Settings2 />
        </Button>
      </div>

      <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
          style={{ width: `${Math.min(100, (shown / target) * 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1" aria-hidden>
          {Array.from({ length: Math.max(glasses, full) }, (_, i) => (
            <Glass key={i} full={i < full} />
          ))}
        </div>
        <Button onClick={add} className="shrink-0 bg-sky-600 text-white hover:bg-sky-600/85">
          + {glassMl} ml
        </Button>
      </div>

      <WaterSettings open={settings} onOpenChange={setSettings} glassMl={glassMl} target={target} />
    </div>
  );
}

function Glass({ full }: { full: boolean }) {
  return (
    <svg viewBox="0 0 16 20" className="h-5 w-4">
      <path
        d="M2 2h12l-1.5 16h-9z"
        className={cn(
          "stroke-sky-500 transition-colors",
          full ? "fill-sky-400/80" : "fill-transparent",
        )}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WaterSettings({
  open,
  onOpenChange,
  glassMl,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  glassMl: number;
  target: number;
}) {
  const [glass, setGlass] = useState(String(glassMl));
  const [goal, setGoal] = useState(String(target / 1000));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await saveWaterSettings({
        glass_ml: Number(glass),
        target_water_ml: Math.round(Number(goal) * 1000),
      });
      if (!r.ok) return setError(r.error);
      toast.success("Water settings saved");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Water</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>One tap adds</Label>
            <Segmented
              value={GLASS_SIZES.includes(glass as never) ? glass : ""}
              onChange={setGlass}
              aria-label="Glass size"
              options={GLASS_SIZES.map((s) => ({ value: s, label: `${s} ml` }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="water-goal">Daily target (litres)</Label>
            <Input
              id="water-goal"
              type="number"
              inputMode="decimal"
              step="0.25"
              min={0.5}
              max={10}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              About 35 ml per kg of body weight, more on training days and hot ones.
            </p>
          </div>
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
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
