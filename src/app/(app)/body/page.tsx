import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Camera, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getHousehold } from "@/lib/household";
import { getBodyMetrics } from "@/lib/body-data";
import { bmi, bmiLabel, formatChange, movingAverage, summarize } from "@/lib/body";
import { relativeDay, todayIST } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { BodyHistory, WeighIn } from "./body-log";
import { WeightChart } from "./weight-chart";

export const metadata: Metadata = { title: "Body" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card min-w-0 rounded-xl border p-3">
      <p className="text-muted-foreground truncate text-xs">{label}</p>
      <p className="font-heading truncate text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground truncate text-xs">{hint}</p>}
    </div>
  );
}

async function photoCount(ownerId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("progress_photos")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  return count ?? 0;
}

async function Body() {
  await connection();
  const today = todayIST();
  const { me } = await getHousehold();
  const [metrics, photos] = await Promise.all([getBodyMetrics(me.id), photoCount(me.id)]);
  const trend = movingAverage(
    metrics.flatMap((m) => (m.weight_kg != null ? [{ date: m.date, kg: m.weight_kg }] : [])),
  );
  const summary = summarize(trend);
  const todays = metrics.find((m) => m.date === today) ?? null;
  const index = summary && me.height_cm ? bmi(summary.current, Number(me.height_cm)) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <WeighIn today={today} todays={todays} lastWeight={summary?.latest.kg ?? null} />

      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Trend weight"
            value={`${summary.current} kg`}
            hint={`Last ${summary.latest.kg} kg, ${relativeDay(summary.latest.date, today).toLowerCase()}`}
          />
          <Stat
            label="This week"
            value={summary.weekChange === null ? "–" : formatChange(summary.weekChange)}
            hint="Average vs a week ago"
          />
          <Stat
            label="Since start"
            value={formatChange(summary.sinceStart)}
            hint={`From ${summary.start.kg} kg`}
          />
          <Stat
            label="BMI"
            value={index ? String(index) : "–"}
            hint={index ? bmiLabel(index) : "Add height in Diet targets"}
          />
        </div>
      )}

      {trend.length > 0 && <WeightChart trend={trend} today={today} />}

      <Link
        href="/body/photos"
        className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-4"
      >
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
          <Camera className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Progress photos</span>
          <span className="text-muted-foreground block text-sm">
            {photos ? `${photos} photo${photos === 1 ? "" : "s"} · ` : ""}Only you can see them
          </span>
        </span>
        <ChevronRight className="text-muted-foreground size-4" />
      </Link>

      <BodyHistory metrics={metrics} today={today} />
    </div>
  );
}

export default function BodyPage() {
  return (
    <>
      <PageHeader title="Body" />
      <Suspense fallback={<div className="bg-muted h-64 max-w-2xl animate-pulse rounded-xl" />}>
        <Body />
      </Suspense>
    </>
  );
}
