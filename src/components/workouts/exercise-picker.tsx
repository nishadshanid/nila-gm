"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { EQUIPMENT, KINDS, MUSCLES, equipmentLabel, focusLabel } from "@/lib/exercise-meta";
import type { Equipment, Exercise, ExerciseKind, Muscle } from "@/lib/types";
import { createExercise } from "@/app/(app)/workouts/actions";

/** Search the exercise list (or add your own) and pick one. */
export function ExercisePicker({
  open,
  onOpenChange,
  exercises,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "">("");
  const [creating, setCreating] = useState(false);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return exercises.filter(
      (e) =>
        (!muscle || e.muscle === muscle) &&
        words.every((w) =>
          `${e.name} ${e.equipment} ${e.muscle} ${e.focus ?? ""}`.toLowerCase().includes(w),
        ),
    );
  }, [exercises, query, muscle]);

  function pick(exercise: Exercise) {
    onPick(exercise);
    onOpenChange(false);
    setQuery("");
    setCreating(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{creating ? "New exercise" : "Add exercise"}</DialogTitle>
        </DialogHeader>
        {creating ? (
          <NewExerciseForm
            initialName={query}
            onCancel={() => setCreating(false)}
            onCreated={pick}
          />
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-8"
                  aria-label="Search exercises"
                />
              </div>
              <NativeSelect
                value={muscle}
                onChange={(e) => setMuscle(e.target.value as Muscle | "")}
                aria-label="Muscle"
                className="w-32"
              >
                <option value="">All</option>
                {MUSCLES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto">
              {shown.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => pick(e)}
                    className="hover:bg-muted flex w-full flex-col items-start rounded-md px-2 py-2 text-left"
                  >
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {focusLabel(e)} · {equipmentLabel(e.equipment)}
                      {e.owner_id && " · yours"}
                    </span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="text-muted-foreground px-2 py-6 text-center text-sm">
                  Nothing matches. Add it as your own below.
                </li>
              )}
            </ul>
            <Button type="button" variant="outline" onClick={() => setCreating(true)}>
              <Plus /> New exercise
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewExerciseForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (exercise: Exercise) => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<Muscle>("chest");
  const [equipment, setEquipment] = useState<Equipment>("dumbbell");
  const [kind, setKind] = useState<ExerciseKind>("strength");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const input = { name, muscle, equipment, kind };
      const result = await createExercise(input);
      if (!result.ok) return setError(result.error);
      onCreated(result.exercise);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="exercise-name">Name</Label>
        <Input
          id="exercise-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoFocus
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-muscle">Muscle</Label>
          <NativeSelect
            id="exercise-muscle"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as Muscle)}
          >
            {MUSCLES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-equipment">Equipment</Label>
          <NativeSelect
            id="exercise-equipment"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment)}
          >
            {EQUIPMENT.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="exercise-kind">Logged as</Label>
        <NativeSelect
          id="exercise-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as ExerciseKind)}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Back
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add exercise"}
        </Button>
      </div>
    </form>
  );
}
