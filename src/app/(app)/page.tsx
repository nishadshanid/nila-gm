import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ChevronRight, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MacroRings, targetsOf } from "@/components/diet/macro-rings";
import { getDayEntries } from "@/lib/diet";
import { sum } from "@/lib/nutrition";
import { TodayWorkout } from "@/components/workouts/today-workout";
import { getProgramme, partnerNext } from "@/lib/workouts";
import { getHousehold } from "@/lib/household";
import { DayComplete } from "@/components/celebrate/day-complete";
import { HabitChecklist } from "@/components/habits/habit-checklist";
import { WaterCard } from "@/components/habits/water-card";
import { getHabitDay } from "@/lib/habit-data";
import { isDayComplete, isMet } from "@/lib/habits";
import { routineForDay } from "@/lib/workout";
import { daysBetween, formatDay, isoWeekday, todayIST, TZ } from "@/lib/dates";
import { getLastWeighInDate } from "@/lib/body-data";
import { PartnerLine } from "@/components/partner-line";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(
      now,
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function Today() {
  await connection();
  const { me, partner } = await getHousehold();
  const now = new Date();
  const today = todayIST(now);
  const [programme, theirs, meals, day, lastWeighIn] = await Promise.all([
    getProgramme(me, today),
    partner?.weekly_goal ? getProgramme(partner, today) : null,
    getDayEntries(me.id, today),
    getHabitDay(me.id, today, me.target_water_ml),
    getLastWeighInDate(me.id),
  ]);
  // On your weigh-in day, or when it's been over a week, until you've weighed in today.
  const weighInDue =
    lastWeighIn !== today &&
    (isoWeekday(today) === me.weigh_in_weekday ||
      !lastWeighIn ||
      daysBetween(lastWeighIn, today) > 7);
  const { routines, schedule, active, history, flexible } = programme;
  const doneToday = history.filter((w) => w.date === today);
  // Flexible: resting is fine while the week's goal still fits in the days left.
  const restDay =
    !active &&
    (flexible ? flexible.week.restOk : routineForDay(schedule, isoWeekday(today)) === null);
  const complete = isDayComplete({
    workoutDone: doneToday.length > 0,
    restDay,
    waterMl: day.water.ml,
    waterTarget: me.target_water_ml,
    habitsMet: day.habits.map((h) => isMet(h, day.values[h.id])),
  });
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold">
          {greeting(now)}, {me.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{formatDay(today, "EEEE d MMMM")}</p>
      </div>
      {partner && (
        <Suspense fallback={<div className="bg-muted mb-6 h-11 animate-pulse rounded-xl" />}>
          <PartnerLine partner={partner} today={today} />
        </Suspense>
      )}
      {weighInDue && (
        <Link
          href="/body"
          className="bg-card hover:bg-muted/50 mb-6 flex items-center gap-3 rounded-xl border p-4"
        >
          <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
            <Scale className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Weigh-in day</span>
            <span className="text-muted-foreground block text-sm">
              Step on the scale before breakfast and log it.
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-4" />
        </Link>
      )}
      {complete && (
        <DayComplete
          date={today}
          detail={`${doneToday.length ? "Trained" : "Rested"}, drank your water${
            day.habits.length ? ` and kept all ${day.habits.length} habits` : ""
          }.`}
        />
      )}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Workout</h2>
        <TodayWorkout
          today={today}
          now={now.getTime()}
          active={active}
          routines={routines}
          schedule={schedule}
          doneToday={doneToday}
          flexible={flexible}
          partner={partnerNext(partner, theirs)}
        />
      </section>
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Food</h2>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/diet" />}>
            <Plus /> Log food
          </Button>
        </div>
        <MacroRings totals={sum(meals)} targets={targetsOf(me)} />
      </section>
      <section className="mb-6">
        <WaterCard
          date={today}
          ml={day.water.ml}
          target={me.target_water_ml}
          glassMl={me.glass_ml}
          streak={day.water.streak}
        />
      </section>
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Habits</h2>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/habits" />}>
            Edit
          </Button>
        </div>
        <HabitChecklist
          date={today}
          habits={day.habits}
          values={day.values}
          streaks={day.streaks}
        />
      </section>
    </>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
      <Today />
    </Suspense>
  );
}
