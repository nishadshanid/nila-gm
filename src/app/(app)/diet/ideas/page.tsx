import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { WeightAdviceCard } from "@/components/weight-advice";
import { getHousehold } from "@/lib/household";
import { getFoods, getMealIdeas } from "@/lib/diet";
import { getBodyMetrics } from "@/lib/body-data";
import { movingAverage, weightAdvice } from "@/lib/body";
import { todayIST } from "@/lib/dates";
import { IdeasManager } from "./ideas-manager";

export const metadata: Metadata = { title: "Meal ideas" };

const TIPS = {
  bulk: "Eating more is the lever: if the scale doesn't move, add food (rice, milk, a banana) before adding more protein.",
  cut: "A moderate deficit with enough protein, lifting and daily walking. No need to eat tiny meals or skip carbs at night.",
  maintain: "Mix and match any idea on any day. The day's total is what matters.",
};

async function Ideas() {
  await connection();
  const { me, partner } = await getHousehold();
  const [mine, theirs, foods, metrics] = await Promise.all([
    getMealIdeas(me.id),
    partner ? getMealIdeas(partner.id) : [],
    getFoods(),
    getBodyMetrics(me.id),
  ]);
  const advice = weightAdvice(
    movingAverage(
      metrics.flatMap((m) => (m.weight_kg != null ? [{ date: m.date, kg: m.weight_kg }] : [])),
    ),
    me.goal,
  );
  return (
    <>
      <div className="mb-5 flex max-w-2xl flex-col gap-2">
        <p className="text-muted-foreground text-sm">{TIPS[me.goal]}</p>
        {advice && <WeightAdviceCard advice={advice} />}
      </div>
      <IdeasManager
        mine={mine}
        theirs={theirs}
        partnerName={partner?.name ?? null}
        foods={foods}
        today={todayIST()}
      />
    </>
  );
}

export default function IdeasPage() {
  return (
    <>
      <PageHeader
        title="Meal ideas"
        description="Foods you often eat together. Add any of them on any day from Add food → Plan."
      />
      <Suspense fallback={<div className="bg-muted h-64 max-w-2xl animate-pulse rounded-xl" />}>
        <Ideas />
      </Suspense>
    </>
  );
}
