import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight, Lightbulb, Salad, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MacroRings, targetsOf } from "@/components/diet/macro-rings";
import { getHousehold } from "@/lib/household";
import { addDays, formatDay, relativeDay, todayIST, TZ } from "@/lib/dates";
import {
  getDayEntries,
  getFavouriteIds,
  getFoods,
  getMealIdeas,
  getRecentFoodIds,
} from "@/lib/diet";
import { mealForHour, sum } from "@/lib/nutrition";
import { MealLog } from "./meal-log";

export const metadata: Metadata = { title: "Diet" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function Diary({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  await connection();
  const now = new Date();
  const today = todayIST(now);
  const asked = (await searchParams).date;
  const date = typeof asked === "string" && DATE_RE.test(asked) && asked <= today ? asked : today;
  const previousDate = addDays(date, -1);
  const nextDate = addDays(date, 1);

  const { me, partner } = await getHousehold();
  const [entries, previousEntries, foods, recentIds, favouriteIds, ideas, partnerIdeas] =
    await Promise.all([
      getDayEntries(me.id, date),
      getDayEntries(me.id, previousDate),
      getFoods(),
      getRecentFoodIds(me.id),
      getFavouriteIds(me.id),
      getMealIdeas(me.id),
      partner ? getMealIdeas(partner.id) : [],
    ]);
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(
      now,
    ),
  );
  const totals = sum(entries);
  const label = relativeDay(date, today);

  return (
    <>
      <nav aria-label="Day" className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          nativeButton={false}
          render={<Link href={`/diet?date=${previousDate}`} />}
        >
          <ChevronLeft />
        </Button>
        <p className="flex-1 text-center font-semibold">
          {label}
          {(label === "Today" || label === "Yesterday") && (
            <span className="text-muted-foreground ml-1.5 text-sm font-normal">
              {formatDay(date)}
            </span>
          )}
        </p>
        {date < today ? (
          <Button
            variant="outline"
            size="icon"
            aria-label="Next day"
            nativeButton={false}
            render={<Link href={nextDate === today ? "/diet" : `/diet?date=${nextDate}`} />}
          >
            <ChevronRight />
          </Button>
        ) : (
          <span className="size-8" />
        )}
      </nav>

      <MacroRings totals={totals} targets={targetsOf(me)} />
      {totals.fibre_g > 0 && (
        <p className="text-muted-foreground mt-1.5 text-right text-xs">
          Fibre {Math.round(totals.fibre_g)} g
        </p>
      )}

      <div className="mt-4">
        <MealLog
          key={date}
          date={date}
          previousDate={previousDate}
          previousLabel={date === today ? "yesterday" : `${formatDay(previousDate, "EEE")}'s`}
          entries={entries}
          previousEntries={previousEntries}
          foods={foods}
          recentIds={recentIds}
          favouriteIds={favouriteIds}
          defaultMeal={date === today ? mealForHour(hour) : "breakfast"}
          ideas={ideas}
          partner={partner ? { name: partner.name, ideas: partnerIdeas } : null}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/diet/targets" />}
        >
          <Target /> Targets
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/diet/foods" />}
        >
          <Salad /> My foods
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/diet/ideas" />}
        >
          <Lightbulb /> Meal ideas
        </Button>
      </div>
    </>
  );
}

export default function DietPage({ searchParams }: PageProps<"/diet">) {
  return (
    <>
      <PageHeader title="Diet" />
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Diary searchParams={searchParams} />
      </Suspense>
    </>
  );
}
