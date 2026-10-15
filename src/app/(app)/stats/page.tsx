import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PersonDot } from "@/components/person-dot";
import { getHousehold } from "@/lib/household";
import { getWeekStats } from "@/lib/week-data";
import { formatChange } from "@/lib/body";
import { addDays, formatDay, startOfWeek, todayIST } from "@/lib/dates";
import type { WeekStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Weekly stats" };

type Row = { label: string; value: (s: WeekStats) => string; hint?: string };

const days = (n: number | null, of: number) => (n === null ? "–" : `${n}/${of}`);

const ROWS: Row[] = [
  {
    label: "Workouts",
    hint: "Done / planned",
    value: (s) => (s.planned ? `${s.workouts}/${s.planned}` : String(s.workouts)),
  },
  {
    label: "Volume",
    hint: "Weight × reps",
    value: (s) => (s.volume ? `${s.volume.toLocaleString("en-IN")} kg` : "–"),
  },
  { label: "Food logged", hint: "Days", value: (s) => days(s.foodDays, s.days) },
  {
    label: "Calories",
    hint: "Daily average",
    value: (s) => (s.avgKcal === null ? "–" : s.avgKcal.toLocaleString("en-IN")),
  },
  {
    label: "Protein",
    hint: "Daily average",
    value: (s) => (s.avgProtein === null ? "–" : `${s.avgProtein} g`),
  },
  {
    label: "Calories on target",
    hint: "Days within 10%",
    value: (s) => days(s.kcalOnTarget, s.foodDays),
  },
  { label: "Protein target", hint: "Days hit", value: (s) => days(s.proteinHit, s.foodDays) },
  { label: "Water target", hint: "Days hit", value: (s) => days(s.waterDays, s.days) },
  { label: "Habits kept", value: (s) => (s.habitRate === null ? "–" : `${s.habitRate}%`) },
  {
    label: "Weight change",
    hint: "7-day average",
    value: (s) => (s.weightChange === null ? "–" : formatChange(s.weightChange)),
  },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function Week({ searchParams }: { searchParams: Promise<{ week?: string | string[] }> }) {
  await connection();
  const today = todayIST();
  const thisWeek = startOfWeek(today);
  const asked = (await searchParams).week;
  const monday =
    typeof asked === "string" && DATE_RE.test(asked) && asked <= thisWeek
      ? startOfWeek(asked)
      : thisWeek;
  const { me, partner } = await getHousehold();
  const people = partner ? [me, partner] : [me];
  const stats = await Promise.all(people.map((p) => getWeekStats(p, monday, today)));
  const prev = addDays(monday, -7);
  const next = addDays(monday, 7);

  return (
    <div className="max-w-2xl">
      <nav aria-label="Week" className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous week"
          nativeButton={false}
          render={<Link href={`/stats?week=${prev}`} />}
        >
          <ChevronLeft />
        </Button>
        <p className="flex-1 text-center font-semibold">
          {monday === thisWeek
            ? "This week"
            : monday === addDays(thisWeek, -7)
              ? "Last week"
              : "Week of"}
          <span className="text-muted-foreground ml-1.5 text-sm font-normal">
            {formatDay(monday, "d MMM")} – {formatDay(addDays(monday, 6), "d MMM")}
          </span>
        </p>
        {monday < thisWeek ? (
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            nativeButton={false}
            render={<Link href={next === thisWeek ? "/stats" : `/stats?week=${next}`} />}
          >
            <ChevronRight />
          </Button>
        ) : (
          <span className="size-8" />
        )}
      </nav>

      <div className="bg-card overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium">
                <span className="sr-only">Measure</span>
              </th>
              {people.map((p) => (
                <th key={p.id} className="px-3 py-2 text-right font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <PersonDot profile={p} /> {p.id === me.id ? "You" : p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {row.label}
                  {row.hint && (
                    <span className="text-muted-foreground block text-xs">{row.hint}</span>
                  )}
                </th>
                {stats.map((s, i) => (
                  <td
                    key={people[i].id}
                    className="px-3 py-2 text-right whitespace-nowrap tabular-nums"
                  >
                    {row.value(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {monday === thisWeek ? "So far this week, " : ""}counting {stats[0].days} day
        {stats[0].days === 1 ? "" : "s"}.
      </p>
    </div>
  );
}

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <>
      <PageHeader title="Weekly stats" />
      <Suspense fallback={<div className="bg-muted h-96 max-w-2xl animate-pulse rounded-xl" />}>
        <Week searchParams={searchParams} />
      </Suspense>
    </>
  );
}
