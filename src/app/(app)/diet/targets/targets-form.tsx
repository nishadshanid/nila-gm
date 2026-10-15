"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { Segmented } from "@/components/segmented";
import {
  ACTIVITIES,
  GOALS,
  ageFrom,
  maintenanceKcal,
  suggestTargets,
  type BodyStats,
} from "@/lib/nutrition";
import type { Activity, Goal, Profile } from "@/lib/types";
import { saveTargets } from "../actions";

const str = (n: number | null) => (n === null ? "" : String(n));
const intOrNull = (v: string) => (v.trim() === "" ? null : Math.round(Number(v)));

export function TargetsForm({ profile, today }: { profile: Profile; today: string }) {
  const router = useRouter();
  const [sex, setSex] = useState<"male" | "female" | "">(profile.sex ?? "");
  const [height, setHeight] = useState(str(profile.height_cm));
  const [birthYear, setBirthYear] = useState(str(profile.birth_year));
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<Activity>(profile.activity);
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [kcal, setKcal] = useState(str(profile.target_kcal));
  const [protein, setProtein] = useState(str(profile.target_protein_g));
  const [carbs, setCarbs] = useState(str(profile.target_carbs_g));
  const [fat, setFat] = useState(str(profile.target_fat_g));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stats: BodyStats | null =
    sex && Number(height) > 0 && Number(birthYear) > 1900 && Number(weight) > 0
      ? {
          sex,
          heightCm: Number(height),
          weightKg: Number(weight),
          age: ageFrom(Number(birthYear), today),
          activity,
          goal,
        }
      : null;

  function suggest() {
    if (!stats) return;
    const t = suggestTargets(stats);
    setKcal(String(t.kcal));
    setProtein(String(t.protein_g));
    setCarbs(String(t.carbs_g));
    setFat(String(t.fat_g));
  }

  // What the typed macros add up to, to compare with the calorie target.
  const fromMacros = Number(protein || 0) * 4 + Number(carbs || 0) * 4 + Number(fat || 0) * 9;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveTargets({
        sex: sex || null,
        height_cm: height.trim() === "" ? null : Number(height),
        birth_year: intOrNull(birthYear),
        activity,
        goal,
        target_kcal: intOrNull(kcal),
        target_protein_g: intOrNull(protein),
        target_carbs_g: intOrNull(carbs),
        target_fat_g: intOrNull(fat),
      });
      if (!result.ok) return setError(result.error);
      toast.success("Targets saved");
      router.push("/diet");
    });
  }

  const box = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    props: React.ComponentProps<"input"> = {},
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => set(e.target.value)}
        {...props}
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="flex max-w-lg flex-col gap-6">
      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
        <h2 className="font-semibold">About you</h2>
        <Segmented
          value={sex}
          onChange={setSex}
          aria-label="Sex"
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
        <div className="grid grid-cols-3 gap-3">
          {box("t-height", "Height (cm)", height, setHeight, { min: 100, max: 250, step: "any" })}
          {box("t-weight", "Weight (kg)", weight, setWeight, { min: 30, max: 300, step: "any" })}
          {box("t-born", "Born in", birthYear, setBirthYear, {
            min: 1930,
            max: 2020,
            inputMode: "numeric",
          })}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-activity" className="text-xs">
            How active are you?
          </Label>
          <NativeSelect
            id="t-activity"
            value={activity}
            onChange={(e) => setActivity(e.target.value as Activity)}
          >
            {ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}: {a.hint}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Goal</Label>
          <Segmented
            value={goal}
            onChange={setGoal}
            aria-label="Goal"
            options={GOALS.map((g) => ({
              value: g.value,
              label: <span className="max-[359px]:text-xs">{g.label}</span>,
            }))}
          />
          <p className="text-muted-foreground text-xs">
            {GOALS.find((g) => g.value === goal)!.hint}
            {stats &&
              `. You burn about ${maintenanceKcal(stats).toLocaleString("en-IN")} kcal a day`}
            .
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={suggest} disabled={!stats}>
          <Sparkles /> Suggest targets
        </Button>
        {!stats && (
          <p className="text-muted-foreground -mt-2 text-center text-xs">
            Fill in all of the above to get a suggestion. Your weight is only used for this.
          </p>
        )}
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
        <h2 className="font-semibold">Every day</h2>
        <div className="grid grid-cols-2 gap-3">
          {box("t-kcal", "Calories (kcal)", kcal, setKcal, { min: 800, max: 6000, step: 1 })}
          {box("t-protein", "Protein (g)", protein, setProtein, { min: 0, max: 500, step: 1 })}
          {box("t-carbs", "Carbs (g)", carbs, setCarbs, { min: 0, max: 1000, step: 1 })}
          {box("t-fat", "Fat (g)", fat, setFat, { min: 0, max: 400, step: 1 })}
        </div>
        {kcal && fromMacros > 0 && Math.abs(fromMacros - Number(kcal)) > 100 && (
          <p className="text-muted-foreground text-xs">
            These macros add up to {Math.round(fromMacros).toLocaleString("en-IN")} kcal, not{" "}
            {Number(kcal).toLocaleString("en-IN")}.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save targets"}
        </Button>
      </div>
    </form>
  );
}
