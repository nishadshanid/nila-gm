import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { HabitChecklist } from "@/components/habits/habit-checklist";
import { WaterCard } from "@/components/habits/water-card";
import { getHousehold } from "@/lib/household";
import { getHabitDay } from "@/lib/habit-data";
import { addDays, formatDay, todayIST } from "@/lib/dates";
import { HabitManager } from "./habit-manager";

export const metadata: Metadata = { title: "Water & habits" };

async function Habits() {
  await connection();
  const today = todayIST();
  const { me } = await getHousehold();
  const day = await getHabitDay(me.id, today, me.target_water_ml);
  const weekLabels = Array.from({ length: 7 }, (_, i) => formatDay(addDays(today, i - 6), "EEE d"));

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <WaterCard
        date={today}
        ml={day.water.ml}
        target={me.target_water_ml}
        glassMl={me.glass_ml}
        streak={day.water.streak}
      />
      <section>
        <h2 className="mb-2 text-sm font-semibold">Today</h2>
        <HabitChecklist
          date={today}
          habits={day.habits}
          values={day.values}
          streaks={day.streaks}
        />
      </section>
      <HabitManager habits={day.habits} week={day.week} weekLabels={weekLabels} />
    </div>
  );
}

export default function HabitsPage() {
  return (
    <>
      <PageHeader title="Water & habits" />
      <Suspense fallback={<div className="bg-muted h-64 max-w-xl animate-pulse rounded-xl" />}>
        <Habits />
      </Suspense>
    </>
  );
}
