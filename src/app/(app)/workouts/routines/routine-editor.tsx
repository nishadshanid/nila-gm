"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/native-select";
import { ExercisePicker } from "@/components/workouts/exercise-picker";
import { equipmentLabel, muscleLabel } from "@/lib/exercise-meta";
import type { Exercise, RoutineWithExercises } from "@/lib/types";
import { deleteRoutine, saveRoutine } from "../actions";

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

type Row = {
  key: string;
  exercise_id: string;
  sets: string;
  reps_min: string;
  reps_max: string;
  rest_s: number;
};

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

const restLabel = (s: number) =>
  s < 60
    ? `${s} s`
    : s % 60
      ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
      : `${s / 60} min`;

export function RoutineEditor({
  routine,
  exercises,
}: {
  routine?: RoutineWithExercises;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [name, setName] = useState(routine?.name ?? "");
  const [notes, setNotes] = useState(routine?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(
    () =>
      routine?.routine_exercises.map((e) => ({
        key: newKey(),
        exercise_id: e.exercise_id,
        sets: String(e.sets),
        reps_min: e.reps_min ? String(e.reps_min) : "",
        reps_max: e.reps_max ? String(e.reps_max) : "",
        rest_s: e.rest_s,
      })) ?? [],
  );
  const [known, setKnown] = useState(exercises);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const byId = new Map(known.map((e) => [e.id, e]));

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, by: number) =>
    setRows((rs) => {
      const next = [...rs];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });

  function add(exercise: Exercise) {
    if (!byId.has(exercise.id)) setKnown((k) => [...k, exercise]);
    const strength = exercise.kind === "strength";
    setRows((rs) => [
      ...rs,
      {
        key: newKey(),
        exercise_id: exercise.id,
        sets: strength ? "3" : "1",
        reps_min: strength ? "8" : "",
        reps_max: strength ? "12" : "",
        rest_s: strength ? 90 : 60,
      },
    ]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveRoutine(
        {
          name,
          notes,
          exercises: rows.map((r) => ({
            exercise_id: r.exercise_id,
            sets: Number(r.sets) || 0,
            reps_min: Number(r.reps_min) || null,
            reps_max: Number(r.reps_max) || null,
            rest_s: r.rest_s,
          })),
        },
        routine?.id,
      );
      if (!result.ok) return setError(result.error);
      toast.success(routine ? "Routine saved" : "Routine created");
      router.push("/workouts");
    });
  }

  function remove() {
    if (!routine || !confirm(`Delete "${routine.name}"? Past workouts stay in your history.`))
      return;
    startTransition(async () => {
      const result = await deleteRoutine(routine.id);
      if (!result.ok) return setError(result.error);
      toast.success("Routine deleted");
      router.push("/workouts");
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="routine-name">Name</Label>
        <Input
          id="routine-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push day, Legs, Full body A"
          maxLength={60}
          required
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Exercises</Label>
        {rows.length === 0 && (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            No exercises yet.
          </p>
        )}
        {rows.map((row, i) => {
          const exercise = byId.get(row.exercise_id);
          const strength = (exercise?.kind ?? "strength") === "strength";
          return (
            <div key={row.key} className="bg-card flex flex-col gap-3 rounded-xl border p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {i + 1}. {exercise?.name ?? "Exercise"}
                  </p>
                  {exercise && (
                    <p className="text-muted-foreground text-xs">
                      {muscleLabel(exercise.muscle)} · {equipmentLabel(exercise.equipment)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove"
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-foreground">Sets</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={row.sets}
                    onChange={(e) => update(row.key, { sets: e.target.value })}
                  />
                </label>
                {strength ? (
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">Reps</span>
                    <span className="flex items-center gap-1">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
                        value={row.reps_min}
                        onChange={(e) => update(row.key, { reps_min: e.target.value })}
                        aria-label="Reps from"
                        className="px-1.5 text-center"
                      />
                      –
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
                        value={row.reps_max}
                        onChange={(e) => update(row.key, { reps_max: e.target.value })}
                        aria-label="Reps to"
                        className="px-1.5 text-center"
                      />
                    </span>
                  </label>
                ) : (
                  <span />
                )}
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-foreground">Rest</span>
                  <NativeSelect
                    value={row.rest_s}
                    onChange={(e) => update(row.key, { rest_s: Number(e.target.value) })}
                  >
                    {REST_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {restLabel(s)}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" onClick={() => setPicking(true)}>
          <Plus /> Add exercise
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="routine-notes">Notes (optional)</Label>
        <Textarea
          id="routine-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {routine && (
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : routine ? "Save" : "Create routine"}
        </Button>
      </div>

      <ExercisePicker open={picking} onOpenChange={setPicking} exercises={known} onPick={add} />
    </form>
  );
}
