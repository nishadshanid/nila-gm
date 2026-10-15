import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getExercises } from "@/lib/workouts";
import { RoutineEditor } from "../routine-editor";

export const metadata: Metadata = { title: "New routine" };

async function Editor() {
  return <RoutineEditor exercises={await getExercises()} />;
}

export default function NewRoutinePage() {
  return (
    <>
      <PageHeader title="New routine" />
      <Suspense fallback={<div className="bg-muted h-64 max-w-xl animate-pulse rounded-xl" />}>
        <Editor />
      </Suspense>
    </>
  );
}
