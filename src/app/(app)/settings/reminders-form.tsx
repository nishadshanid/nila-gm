"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/native-select";
import { WEEKDAYS } from "@/lib/exercise-meta";
import type { Profile } from "@/lib/types";
import { saveReminders, type RemindersInput } from "./actions";

const hhmm = (t: string) => t.slice(0, 5);

function Row({
  id,
  title,
  hint,
  on,
  onChange,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor={id}>{title}</Label>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        <Switch id={id} checked={on} onCheckedChange={onChange} />
      </div>
      {on && children && (
        <div className="flex flex-wrap items-center gap-2 text-sm">{children}</div>
      )}
    </div>
  );
}

function TimeInput(props: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Input
      type="time"
      aria-label={props.label}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className="w-32"
      required
    />
  );
}

/** Which phone reminders you want, and when. They only come when there's a reason. */
export function RemindersForm({ profile }: { profile: Profile }) {
  const [r, setR] = useState<RemindersInput>(() => ({
    remind_workout: profile.remind_workout,
    remind_workout_at: hhmm(profile.remind_workout_at),
    remind_water: profile.remind_water,
    water_from: hhmm(profile.water_from),
    water_to: hhmm(profile.water_to),
    water_every_h: profile.water_every_h,
    remind_meals: profile.remind_meals,
    remind_meals_at: hhmm(profile.remind_meals_at),
    remind_weigh_in: profile.remind_weigh_in,
    weigh_in_weekday: profile.weigh_in_weekday,
    weigh_in_at: hhmm(profile.weigh_in_at),
    notify_partner_workouts: profile.notify_partner_workouts,
  }));
  const [pending, startTransition] = useTransition();
  const set =
    <K extends keyof RemindersInput>(key: K) =>
    (value: RemindersInput[K]) =>
      setR((x) => ({ ...x, [key]: value }));

  function save() {
    startTransition(async () => {
      const result = await saveReminders(r);
      if (result.error) return void toast.error(result.error);
      toast.success("Reminders saved");
    });
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y">
        <Row
          id="rem-workout"
          title="Workout days"
          hint="On days with a routine in your weekly plan, if you haven't started yet."
          on={r.remind_workout}
          onChange={set("remind_workout")}
        >
          At
          <TimeInput
            label="Workout reminder time"
            value={r.remind_workout_at}
            onChange={set("remind_workout_at")}
          />
        </Row>
        <Row
          id="rem-water"
          title="Water"
          hint="A nudge when you're behind on water. Silent when you're on track."
          on={r.remind_water}
          onChange={set("remind_water")}
        >
          Every
          <NativeSelect
            aria-label="Hours between water reminders"
            value={r.water_every_h}
            onChange={(e) => set("water_every_h")(Number(e.target.value))}
            className="w-24"
          >
            {[1, 2, 3, 4].map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </NativeSelect>
          from
          <TimeInput
            label="Water reminders from"
            value={r.water_from}
            onChange={set("water_from")}
          />
          to
          <TimeInput label="Water reminders until" value={r.water_to} onChange={set("water_to")} />
        </Row>
        <Row
          id="rem-meals"
          title="Log meals"
          hint="In the evening, if fewer than two meals are logged."
          on={r.remind_meals}
          onChange={set("remind_meals")}
        >
          At
          <TimeInput
            label="Meal reminder time"
            value={r.remind_meals_at}
            onChange={set("remind_meals_at")}
          />
        </Row>
        <Row
          id="rem-weigh"
          title="Weekly weigh-in"
          hint="If you haven't weighed in yet that day."
          on={r.remind_weigh_in}
          onChange={set("remind_weigh_in")}
        >
          <NativeSelect
            aria-label="Weigh-in day"
            value={r.weigh_in_weekday}
            onChange={(e) => set("weigh_in_weekday")(Number(e.target.value))}
            className="w-24"
          >
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </NativeSelect>
          at
          <TimeInput
            label="Weigh-in reminder time"
            value={r.weigh_in_at}
            onChange={set("weigh_in_at")}
          />
        </Row>
        <Row
          id="rem-partner"
          title="Partner's workouts"
          hint="When your partner finishes a workout, with how it went."
          on={r.notify_partner_workouts}
          onChange={set("notify_partner_workouts")}
        />
      </div>
      <Button className="mt-4 self-end" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save reminders"}
      </Button>
    </div>
  );
}
