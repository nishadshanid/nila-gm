"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CloudOff, EllipsisVertical, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ExercisePicker } from "@/components/workouts/exercise-picker";
import { SwapDialog } from "@/components/workouts/swap-dialog";
import { tapFeedback } from "@/lib/haptics";
import { equipmentLabel, focusLabel } from "@/lib/exercise-meta";
import {
  formatClock,
  formatKg,
  formatSetShort,
  readyToProgress,
  repsLabel,
  volume,
} from "@/lib/workout";
import type { Exercise, ExerciseKind, WorkoutSet } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dropSet, flushSets, queueSet } from "@/lib/set-queue";
import type { SetValuesInput } from "@/lib/workout-schema";
import {
  addSets,
  deleteWorkout,
  finishWorkout,
  removeSets,
  swapExercise,
  updateSet,
} from "../../actions";
import { RestTimer } from "./rest-timer";

type Previous = Pick<WorkoutSet, "set_no" | "reps" | "weight_kg" | "duration_s" | "distance_m">;
type Target = { reps_min: number | null; reps_max: number | null; notes: string | null };

/** What's typed into a set's boxes. Time is minutes for cardio, seconds for holds. */
type Fields = { weight: string; reps: string; time: string; km: string };

function fieldsOf(s: Previous, kind: ExerciseKind): Fields {
  return {
    weight: s.weight_kg != null ? formatKg(s.weight_kg) : "",
    reps: s.reps != null ? String(s.reps) : "",
    time:
      s.duration_s != null
        ? kind === "cardio"
          ? String(Math.round((s.duration_s / 60) * 10) / 10)
          : String(s.duration_s)
        : "",
    km: s.distance_m != null ? String(s.distance_m / 1000) : "",
  };
}

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

function valuesOf(f: Fields, kind: ExerciseKind) {
  const time = num(f.time);
  const km = num(f.km);
  const reps = num(f.reps);
  return {
    reps: kind === "strength" && reps !== null ? Math.round(reps) : null,
    weight_kg: kind === "strength" ? num(f.weight) : null,
    duration_s: time === null ? null : Math.round(kind === "cardio" ? time * 60 : time),
    distance_m: kind === "cardio" && km !== null ? Math.round(km * 1000) : null,
  };
}

const isEmpty = (f: Fields, kind: ExerciseKind) =>
  kind === "strength" ? !f.reps && !f.weight : kind === "cardio" ? !f.time && !f.km : !f.time;

export function Logger({
  workout,
  initialSets,
  exercises,
  lastTime: initialLastTime,
  targets: initialTargets,
  routineNotes = null,
}: {
  workout: { id: string; name: string; started_at: string };
  initialSets: WorkoutSet[];
  exercises: Exercise[];
  lastTime: Record<string, Previous[]>;
  targets: Record<string, Target>;
  routineNotes?: string | null;
}) {
  const router = useRouter();
  const [known, setKnown] = useState(exercises);
  const [lastTime, setLastTime] = useState(initialLastTime);
  const [targets, setTargets] = useState(initialTargets);
  /** The block being swapped: its position and exercise. */
  const [swapping, setSwapping] = useState<{ position: number; exercise: Exercise } | null>(null);
  /** The full exercise list is open to pick a swap rather than to add. */
  const [pickingSwap, setPickingSwap] = useState<{ position: number; from: string } | null>(null);
  const byId = useMemo(() => new Map(known.map((e) => [e.id, e])), [known]);
  const kindOf = useCallback((id: string) => byId.get(id)?.kind ?? "strength", [byId]);

  const [sets, setSets] = useState(initialSets);
  const [fields, setFields] = useState<Record<string, Fields>>(() =>
    Object.fromEntries(initialSets.map((s) => [s.id, fieldsOf(s, kindOf(s.exercise_id))])),
  );
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  /** Sets saved on this phone while there was no signal, still to be sent. */
  const [waiting, setWaiting] = useState(0);

  /**
   * Saves a set. With no signal it's kept on the phone and sent when the
   * network is back, so logging never stops in a basement gym.
   */
  const sendSet = useCallback(
    async (id: string, values: SetValuesInput) => {
      if (!navigator.onLine) return setWaiting(queueSet(workout.id, id, values));
      try {
        const result = await updateSet(id, values);
        if (!result.ok) toast.error(`Couldn't save the set: ${result.error}`);
        setWaiting(dropSet(workout.id, id));
      } catch {
        setWaiting(queueSet(workout.id, id, values));
      }
    },
    [workout.id],
  );

  const flush = useCallback(
    () => flushSets(workout.id, updateSet).then((left) => (setWaiting(left), left)),
    [workout.id],
  );

  /** Runs a server call; a dropped connection becomes a message, not a crash. */
  const online = <T,>(call: () => Promise<T>) =>
    call().catch(() => {
      toast.error("No signal. Try that again when you're back online.");
      return null;
    });

  // Send what's waiting when the signal comes back (and keep trying meanwhile).
  useEffect(() => {
    // Also picks up sets left on the phone if the app was closed offline.
    const onOnline = () => void flush();
    onOnline();
    window.addEventListener("online", onOnline);
    const id = setInterval(onOnline, 20_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(id);
    };
  }, [workout.id, flush]);

  // The workout clock.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  // Keep the screen on while you train.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {}
    };
    const onVisible = () => document.visibilityState === "visible" && void acquire();
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  const blocks = useMemo(() => {
    const map = new Map<number, WorkoutSet[]>();
    for (const s of [...sets].sort((a, b) => a.position - b.position || a.set_no - b.set_no)) {
      map.set(s.position, [...(map.get(s.position) ?? []), s]);
    }
    return [...map.entries()].map(([position, list]) => ({ position, sets: list }));
  }, [sets]);

  /** Last time's matching working set (the 2nd working set ↔ the 2nd last time). Not for warm-ups. */
  function previousFor(s: WorkoutSet, block: WorkoutSet[]): Previous | undefined {
    if (s.is_warmup) return undefined;
    const last = lastTime[s.exercise_id];
    const index = block.filter((x) => !x.is_warmup && x.set_no <= s.set_no).length - 1;
    return last?.[index] ?? last?.at(-1);
  }

  function save(s: WorkoutSet, f: Fields, done: boolean) {
    const kind = kindOf(s.exercise_id);
    const values = valuesOf(f, kind);
    setSets((all) => all.map((x) => (x.id === s.id ? { ...x, ...values, done } : x)));
    startTransition(() => sendSet(s.id, { ...values, is_warmup: s.is_warmup, done }));
  }

  function edit(s: WorkoutSet, key: keyof Fields, value: string) {
    setFields((all) => ({ ...all, [s.id]: { ...all[s.id], [key]: value } }));
  }

  /** Saves a ticked set when you change its numbers afterwards. */
  function commit(s: WorkoutSet) {
    if (s.done) save(s, fields[s.id], true);
  }

  function toggle(s: WorkoutSet, block: WorkoutSet[]) {
    const kind = kindOf(s.exercise_id);
    if (s.done) return save(s, fields[s.id], false);

    // Boxes left empty take last time's numbers (what the hints show), or the
    // routine's target reps. Typed numbers (or a carried weight) are kept.
    let f = fields[s.id];
    const prev = previousFor(s, block);
    if (prev) {
      const last = fieldsOf(prev, kind);
      f = {
        weight: f.weight || last.weight,
        reps: f.reps || last.reps,
        time: f.time || last.time,
        km: f.km || last.km,
      };
    }
    const target = targets[s.exercise_id];
    if (kind === "strength" && !f.reps && (target?.reps_max || target?.reps_min)) {
      f = { ...f, reps: String(target.reps_max ?? target.reps_min) };
    }
    if (isEmpty(f, kind) || (kind === "strength" && !f.reps)) {
      toast(kind === "strength" ? "Enter the reps first" : "Enter the time first");
      return;
    }

    // Carry the weight into the next sets that are still empty.
    const carried: Record<string, Fields> = { [s.id]: f };
    if (kind === "strength" && f.weight) {
      for (const next of block) {
        if (next.set_no > s.set_no && !next.done && !fields[next.id].weight) {
          carried[next.id] = { ...fields[next.id], weight: f.weight };
        }
      }
    }
    setFields((all) => ({ ...all, ...carried }));
    save(s, f, true);
    tapFeedback();
    if (!s.is_warmup && s.rest_s > 0) setRestEnd(new Date().getTime() + s.rest_s * 1000);
  }

  function toggleWarmup(s: WorkoutSet) {
    const updated = { ...s, is_warmup: !s.is_warmup };
    setSets((all) => all.map((x) => (x.id === s.id ? updated : x)));
    const values = valuesOf(fields[s.id], kindOf(s.exercise_id));
    startTransition(() => sendSet(s.id, { ...values, is_warmup: updated.is_warmup, done: s.done }));
  }

  function addSet(block: WorkoutSet[]) {
    if (!navigator.onLine) return void toast("No signal. Add the set when you're back online.");
    const last = block.at(-1)!;
    startTransition(async () => {
      const result = await online(() =>
        addSets(workout.id, last.exercise_id, last.position, last.set_no + 1, 1, last.rest_s),
      );
      if (!result) return;
      if (!result.ok) return void toast.error(result.error);
      const added = result.sets as WorkoutSet[];
      setSets((all) => [...all, ...added]);
      setFields((all) => ({
        ...all,
        ...Object.fromEntries(
          added.map((x) => [
            x.id,
            { ...fieldsOf(x, kindOf(x.exercise_id)), weight: all[last.id]?.weight ?? "" },
          ]),
        ),
      }));
    });
  }

  function removeFromBlock(ids: string[]) {
    if (!navigator.onLine) return void toast("No signal. Remove it when you're back online.");
    for (const id of ids) setWaiting(dropSet(workout.id, id));
    setSets((all) => all.filter((x) => !ids.includes(x.id)));
    startTransition(async () => {
      const result = await online(() => removeSets(ids));
      if (result && !result.ok) toast.error(result.error);
    });
  }

  function swap(position: number, fromId: string, exercise: Exercise) {
    setSwapping(null);
    setPickingSwap(null);
    if (!navigator.onLine) return void toast("No signal. Swap it when you're back online.");
    if (!byId.has(exercise.id)) setKnown((k) => [...k, exercise]);
    startTransition(async () => {
      const result = await online(() => swapExercise(workout.id, position, exercise.id));
      if (!result) return;
      if (!result.ok) return void toast.error(result.error);
      const changed = result.sets as WorkoutSet[];
      const ids = new Set(changed.map((x) => x.id));
      setSets((all) => [...all.filter((x) => !ids.has(x.id)), ...changed]);
      setFields((all) => ({
        ...all,
        ...Object.fromEntries(changed.map((x) => [x.id, fieldsOf(x, exercise.kind)])),
      }));
      setLastTime((all) => ({ ...all, [exercise.id]: result.last }));
      // Keep the plan's sets × reps for the replacement.
      setTargets((all) => (all[fromId] ? { ...all, [exercise.id]: all[fromId] } : all));
      for (const id of ids) dropSet(workout.id, id);
      toast.success(`Swapped to ${exercise.name}`);
    });
  }

  function addExercise(exercise: Exercise) {
    if (!navigator.onLine) return void toast("No signal. Add it when you're back online.");
    if (!byId.has(exercise.id)) setKnown((k) => [...k, exercise]);
    const position = Math.max(-1, ...sets.map((s) => s.position)) + 1;
    startTransition(async () => {
      const result = await online(() =>
        addSets(
          workout.id,
          exercise.id,
          position,
          1,
          exercise.kind === "strength" ? 3 : 1,
          exercise.kind === "strength" ? 90 : 60,
        ),
      );
      if (!result) return;
      if (!result.ok) return void toast.error(result.error);
      const added = result.sets as WorkoutSet[];
      setSets((all) => [...all, ...added]);
      setFields((all) => ({
        ...all,
        ...Object.fromEntries(added.map((x) => [x.id, fieldsOf(x, exercise.kind)])),
      }));
    });
  }

  const doneSets = sets.filter((s) => s.done && !s.is_warmup);
  const elapsed = now === null ? null : (now - new Date(workout.started_at).getTime()) / 1000;

  return (
    <div className="pb-20">
      <div className="bg-background/95 sticky top-14 z-20 -mx-4 mb-4 flex items-center gap-2 border-b px-4 py-2 backdrop-blur">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading truncate text-lg font-semibold">{workout.name}</h1>
          <p className="text-muted-foreground text-xs tabular-nums">
            {elapsed === null ? "–" : formatClock(elapsed)} · {doneSets.length} set
            {doneSets.length === 1 ? "" : "s"} · {volume(sets).toLocaleString("en-IN")} kg
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="Workout actions" />}
          >
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (!confirm("Discard this workout? Everything logged in it is deleted.")) return;
                startTransition(async () => {
                  const result = await deleteWorkout(workout.id);
                  if (!result.ok) return void toast.error(result.error);
                  router.push("/workouts");
                });
              }}
            >
              <Trash2 /> Discard workout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={async () => {
            if (waiting && (await flush())) {
              return void toast("Some sets are still on this phone. Finish once there's signal.");
            }
            setFinishing(true);
          }}
        >
          Finish
        </Button>
      </div>
      {routineNotes && <p className="text-muted-foreground -mt-2 mb-4 text-xs">{routineNotes}</p>}
      {waiting > 0 && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <CloudOff className="size-4 shrink-0" />
          No signal. {waiting} set{waiting === 1 ? " is" : "s are"} saved on this phone and will be
          sent when it&apos;s back.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {blocks.map(({ position, sets: block }) => {
          const exercise = byId.get(block[0].exercise_id);
          const kind = exercise?.kind ?? "strength";
          const target = targets[block[0].exercise_id];
          const targetText = target ? repsLabel(target.reps_min, target.reps_max) : "";
          const goHeavier =
            kind === "strength" &&
            target?.reps_max &&
            readyToProgress(lastTime[block[0].exercise_id], target.reps_max)
              ? target.reps_max
              : null;
          return (
            <section key={position} className="bg-card rounded-xl border p-3">
              <div className="mb-2 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{exercise?.name ?? "Exercise"}</h2>
                  {exercise && (
                    <p className="text-muted-foreground text-xs">
                      {focusLabel(exercise)} · {equipmentLabel(exercise.equipment)}
                      {targetText && ` · target ${targetText}`}
                      {target?.notes && ` · ${target.notes}`}
                    </p>
                  )}
                  {goHeavier && (
                    <p className="mt-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                      Hit {goHeavier} on every set last time: go a little heavier
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" aria-label="Exercise actions" />}
                  >
                    <EllipsisVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {exercise && block.some((x) => !x.done) && (
                      <DropdownMenuItem onClick={() => setSwapping({ position, exercise })}>
                        <Repeat /> Swap exercise
                      </DropdownMenuItem>
                    )}
                    {block.length > 1 && (
                      <DropdownMenuItem onClick={() => removeFromBlock([block.at(-1)!.id])}>
                        <Trash2 /> Remove last set
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => removeFromBlock(block.map((x) => x.id))}
                    >
                      <Trash2 /> Remove exercise
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div
                className={cn(
                  "text-muted-foreground grid items-center gap-x-1.5 px-1 pb-1 text-[0.7rem] font-medium uppercase sm:gap-x-2",
                  kind === "time"
                    ? "grid-cols-[1.5rem_1fr_4.5rem_2.5rem] sm:grid-cols-[2rem_1fr_5rem_2.75rem]"
                    : "grid-cols-[1.5rem_1fr_3.25rem_3.25rem_2.5rem] sm:grid-cols-[2rem_1fr_4rem_4rem_2.75rem]",
                )}
              >
                <span className="text-center">Set</span>
                <span>Last</span>
                {kind === "strength" && (
                  <>
                    <span className="text-center">kg</span>
                    <span className="text-center">Reps</span>
                  </>
                )}
                {kind === "cardio" && (
                  <>
                    <span className="text-center">Min</span>
                    <span className="text-center">km</span>
                  </>
                )}
                {kind === "time" && <span className="text-center">Sec</span>}
                <span />
              </div>

              <ul className="flex flex-col gap-1">
                {block.map((s, i) => {
                  const f = fields[s.id] ?? fieldsOf(s, kind);
                  const prev = previousFor(s, block);
                  const prevText = prev ? formatSetShort(prev, kind) || "–" : "–";
                  const placeholder = prev ? fieldsOf(prev, kind) : null;
                  const working = block.slice(0, i + 1).filter((x) => !x.is_warmup).length;
                  const box = (key: keyof Fields, label: string, mode: "decimal" | "numeric") => (
                    <input
                      type="text"
                      inputMode={mode}
                      value={f[key]}
                      placeholder={
                        placeholder?.[key] ||
                        (key === "reps" && targetText
                          ? String(target?.reps_max ?? target?.reps_min ?? "")
                          : "")
                      }
                      onChange={(e) => edit(s, key, e.target.value)}
                      onBlur={() => commit(s)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Set ${i + 1} ${label}`}
                      className={cn(
                        "bg-muted/60 placeholder:text-muted-foreground/60 focus-visible:ring-ring h-10 w-full min-w-0 rounded-md text-center text-base font-semibold tabular-nums outline-none focus-visible:ring-2",
                        s.done && "bg-transparent",
                      )}
                    />
                  );
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "grid items-center gap-x-1.5 rounded-lg px-1 py-0.5 transition-colors sm:gap-x-2",
                        kind === "time"
                          ? "grid-cols-[1.5rem_1fr_4.5rem_2.5rem] sm:grid-cols-[2rem_1fr_5rem_2.75rem]"
                          : "grid-cols-[1.5rem_1fr_3.25rem_3.25rem_2.5rem] sm:grid-cols-[2rem_1fr_4rem_4rem_2.75rem]",
                        s.done && "bg-green-600/10",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleWarmup(s)}
                        aria-label={
                          s.is_warmup
                            ? "Warm-up set (tap for working set)"
                            : "Working set (tap for warm-up)"
                        }
                        className={cn(
                          "h-8 rounded-md text-center text-sm font-semibold",
                          s.is_warmup ? "text-amber-600" : "text-muted-foreground",
                        )}
                      >
                        {s.is_warmup ? "W" : working}
                      </button>
                      <span className="text-muted-foreground truncate text-sm tabular-nums">
                        {prevText}
                      </span>
                      {kind === "strength" && (
                        <>
                          {box("weight", "weight in kg", "decimal")}
                          {box("reps", "reps", "numeric")}
                        </>
                      )}
                      {kind === "cardio" && (
                        <>
                          {box("time", "minutes", "decimal")}
                          {box("km", "distance in km", "decimal")}
                        </>
                      )}
                      {kind === "time" && box("time", "seconds", "numeric")}
                      <button
                        type="button"
                        onClick={() => toggle(s, block)}
                        aria-pressed={s.done}
                        aria-label={
                          s.done ? `Set ${i + 1} done (tap to undo)` : `Tick off set ${i + 1}`
                        }
                        className={cn(
                          "flex size-10 items-center justify-center rounded-md border transition-colors",
                          s.done
                            ? "border-green-600 bg-green-600 text-white"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <Check className="size-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground mt-1 w-full"
                onClick={() => addSet(block)}
              >
                <Plus /> Add set
              </Button>
            </section>
          );
        })}
      </div>

      <Button variant="outline" className="mt-4 w-full" onClick={() => setPicking(true)}>
        <Plus /> Add exercise
      </Button>

      <ExercisePicker
        open={picking || pickingSwap !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPicking(false);
            setPickingSwap(null);
          }
        }}
        exercises={known}
        onPick={(e) =>
          pickingSwap ? swap(pickingSwap.position, pickingSwap.from, e) : addExercise(e)
        }
      />
      <SwapDialog
        exercise={swapping?.exercise ?? null}
        onOpenChange={(open) => !open && setSwapping(null)}
        exercises={known}
        exclude={[...new Set(sets.map((x) => x.exercise_id))]}
        onPick={(e) => swapping && swap(swapping.position, swapping.exercise.id, e)}
        onSearchAll={() => {
          if (!swapping) return;
          setPickingSwap({ position: swapping.position, from: swapping.exercise.id });
          setSwapping(null);
        }}
      />
      <RestTimer endAt={restEnd} onChange={setRestEnd} />
      <FinishDialog
        open={finishing}
        onOpenChange={setFinishing}
        workoutId={workout.id}
        doneCount={doneSets.length}
        totalVolume={volume(sets)}
        elapsed={elapsed}
      />
    </div>
  );
}

const FEELINGS = ["Tough", "Meh", "OK", "Good", "Great"];

function FinishDialog({
  open,
  onOpenChange,
  workoutId,
  doneCount,
  totalVolume,
  elapsed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  doneCount: number;
  totalVolume: number;
  elapsed: number | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [feeling, setFeeling] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function finish() {
    startTransition(async () => {
      const result = await finishWorkout(workoutId, notes, feeling);
      if (!result.ok) return void toast.error(result.error);
      tapFeedback();
      router.push(`/workouts/${workoutId}?done=1`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Finish workout?</DialogTitle>
        </DialogHeader>
        {doneCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sets are ticked off yet. Tick the ones you did (✓), or discard the workout from the ⋮
            menu.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {elapsed !== null && `${formatClock(elapsed)} · `}
              {doneCount} set{doneCount === 1 ? "" : "s"} · {totalVolume.toLocaleString("en-IN")} kg
              lifted. Sets you didn&apos;t tick are left out.
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">How did it feel?</span>
              <div
                className="flex justify-between gap-1"
                role="radiogroup"
                aria-label="How did it feel?"
              >
                {FEELINGS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={feeling === i + 1}
                    onClick={() => setFeeling(feeling === i + 1 ? null : i + 1)}
                    className={cn(
                      "min-w-0 flex-1 rounded-lg border py-2 text-sm transition-colors",
                      feeling === i + 1
                        ? "border-green-600 bg-green-600/10 font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              maxLength={1000}
            />
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep going
          </Button>
          <Button onClick={finish} disabled={pending || doneCount === 0}>
            {pending ? "Saving…" : "Finish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
