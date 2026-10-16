import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Check, ChevronRight, Dumbbell, Flame, Moon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PersonDot } from "@/components/person-dot";
import { MacroRings, targetsOf } from "@/components/diet/macro-rings";
import { HabitIconView } from "@/components/habits/habit-icon";
import { getHousehold } from "@/lib/household";
import { getProgramme } from "@/lib/workouts";
import { getDayEntries } from "@/lib/diet";
import { getHabitDay } from "@/lib/habit-data";
import { getBodyMetrics } from "@/lib/body-data";
import { formatChange, movingAverage, summarize } from "@/lib/body";
import { formatMl, formatProgress, isMet } from "@/lib/habits";
import { sum } from "@/lib/nutrition";
import { formatMinutes, routineForDay, volume } from "@/lib/workout";
import { isoWeekday, relativeDay, todayIST } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { LiveSync } from "@/components/realtime/live-sync";

export const metadata: Metadata = { title: "Partner" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

async function PartnerDay() {
  await connection();
  const today = todayIST();
  const { partner } = await getHousehold();
  if (!partner) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        Your partner&apos;s account hasn&apos;t been added yet.
      </p>
    );
  }
  const [programme, meals, day, metrics] = await Promise.all([
    getProgramme(partner, today),
    getDayEntries(partner.id, today),
    getHabitDay(partner.id, today, partner.target_water_ml),
    getBodyMetrics(partner.id),
  ]);
  const { routines, schedule, active, flexible } = programme;
  const history = programme.history.slice(0, 5);
  const doneToday = history.filter((w) => w.date === today);
  const planned = flexible
    ? null
    : routines.find((r) => r.id === routineForDay(schedule, isoWeekday(today)));
  const week = flexible ? ` · ${flexible.week.done} of ${flexible.week.goal} this week` : "";
  const weight = summarize(
    movingAverage(
      metrics.flatMap((m) => (m.weight_kg != null ? [{ date: m.date, kg: m.weight_kg }] : [])),
    ),
  );
  const water = day.water.ml;
  const target = partner.target_water_ml;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <LiveSync ownerId={partner.id} />
      <p className="text-muted-foreground -mt-4 flex items-center gap-1.5 text-sm">
        <PersonDot profile={partner} /> {partner.name}&apos;s day so far. You can look, not change.
      </p>

      <Section title="Workout">
        <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
          {active ? (
            <>
              <Dumbbell className="size-6 shrink-0 text-green-600" />
              <p className="font-semibold">{active.name} in progress</p>
            </>
          ) : doneToday.length ? (
            <>
              <Check className="size-6 shrink-0 text-green-600" />
              <Link href={`/workouts/${doneToday[0].id}`} className="font-semibold underline">
                {doneToday[0].name} done
              </Link>
              <span className="text-muted-foreground text-sm">{week}</span>
            </>
          ) : flexible?.next ? (
            <>
              <Dumbbell className="text-muted-foreground size-6 shrink-0" />
              <p className="font-semibold">
                Next: {flexible.next.name}
                <span className="text-muted-foreground font-normal">{week}</span>
              </p>
            </>
          ) : planned ? (
            <>
              <Dumbbell className="text-muted-foreground size-6 shrink-0" />
              <p className="font-semibold">{planned.name} planned, not started yet</p>
            </>
          ) : (
            <>
              <Moon className="text-muted-foreground size-6 shrink-0" />
              <p className="font-semibold">Rest day</p>
            </>
          )}
        </div>
      </Section>

      <Section title="Food">
        <MacroRings totals={sum(meals)} targets={targetsOf(partner)} readOnly />
      </Section>

      <Section title="Water and habits">
        <div className="bg-card rounded-xl border">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Water</span>
              <span className="text-muted-foreground block text-xs tabular-nums">
                {formatMl(water)} of {formatMl(target)}
              </span>
            </span>
            <span className="bg-muted h-2 w-24 overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full bg-sky-500"
                style={{ width: `${Math.min(100, (water / target) * 100)}%` }}
              />
            </span>
          </div>
          {day.habits.map((h) => {
            const met = isMet(h, day.values[h.id]);
            return (
              <div key={h.id} className="flex items-center gap-3 border-t px-3 py-2.5">
                <HabitIconView
                  name={h.icon}
                  className={cn(met && "bg-green-600/15 text-green-700 dark:text-green-400")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{h.name}</span>
                  {h.kind === "number" && (
                    <span className="text-muted-foreground block text-xs tabular-nums">
                      {formatProgress(day.values[h.id] ?? 0, h)}
                    </span>
                  )}
                </span>
                {day.streaks[h.id] > 1 && (
                  <span className="text-muted-foreground inline-flex items-center gap-0.5 text-sm tabular-nums">
                    <Flame className="size-3.5 text-orange-500" />
                    {day.streaks[h.id]}
                  </span>
                )}
                {met && <Check className="size-4 text-green-600" strokeWidth={3} />}
              </div>
            );
          })}
        </div>
      </Section>

      {weight && (
        <Section title="Weight">
          <p className="bg-card rounded-xl border p-4 text-sm">
            Trend {weight.current} kg
            {weight.weekChange !== null && `, ${formatChange(weight.weekChange)} this week`}
            {`, ${formatChange(weight.sinceStart)} since starting`}.
          </p>
        </Section>
      )}

      <Section title="Recent workouts">
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No finished workouts yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {history.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/workouts/${w.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{w.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {relativeDay(w.date, today)} ·{" "}
                      {formatMinutes(
                        new Date(w.ended_at!).getTime() - new Date(w.started_at).getTime(),
                      )}
                      {volume(w.workout_sets) > 0 &&
                        ` · ${volume(w.workout_sets).toLocaleString("en-IN")} kg`}
                    </span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Link href="/stats" className="text-sm underline">
        Compare your weeks
      </Link>
    </div>
  );
}

export default function PartnerPage() {
  return (
    <>
      <PageHeader title="Partner" />
      <Suspense fallback={<div className="bg-muted h-96 max-w-xl animate-pulse rounded-xl" />}>
        <PartnerDay />
      </Suspense>
    </>
  );
}
