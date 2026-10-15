import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getHousehold } from "@/lib/household";
import { todayIST } from "@/lib/dates";
import { getLatestWeight } from "@/lib/body-data";
import { TargetsForm } from "./targets-form";

export const metadata: Metadata = { title: "Diet targets" };

async function Form() {
  await connection();
  const { me } = await getHousehold();
  const weight = await getLatestWeight(me.id);
  return <TargetsForm profile={me} today={todayIST()} latestWeight={weight} />;
}

export default function TargetsPage() {
  return (
    <>
      <PageHeader
        title="Daily targets"
        description="Fill in your details for a suggestion, then change any number you like."
      />
      <Suspense fallback={<div className="bg-muted h-96 max-w-lg animate-pulse rounded-xl" />}>
        <Form />
      </Suspense>
    </>
  );
}
