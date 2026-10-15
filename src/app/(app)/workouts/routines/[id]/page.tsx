import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getHousehold } from "@/lib/household";
import { getExercises, getRoutine } from "@/lib/workouts";
import { RoutineEditor } from "../routine-editor";

export const metadata: Metadata = { title: "Edit routine" };

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ me }, routine, exercises] = await Promise.all([
    getHousehold(),
    getRoutine(id),
    getExercises(),
  ]);
  // Only your own routines can be edited.
  if (!routine || routine.owner_id !== me.id) notFound();
  return <RoutineEditor routine={routine} exercises={exercises} />;
}

export default function EditRoutinePage({ params }: PageProps<"/workouts/routines/[id]">) {
  return (
    <>
      <PageHeader title="Edit routine" />
      <Suspense fallback={<div className="bg-muted h-64 max-w-xl animate-pulse rounded-xl" />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}
