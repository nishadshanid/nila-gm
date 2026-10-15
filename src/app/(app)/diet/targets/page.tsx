import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getHousehold } from "@/lib/household";
import { todayIST } from "@/lib/dates";
import { TargetsForm } from "./targets-form";

export const metadata: Metadata = { title: "Diet targets" };

async function Form() {
  await connection();
  const { me } = await getHousehold();
  return <TargetsForm profile={me} today={todayIST()} />;
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
