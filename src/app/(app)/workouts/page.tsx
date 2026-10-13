import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Workouts" };

export default function Page() {
  return (
    <>
      <PageHeader title="Workouts" />
      <ComingSoon icon={Dumbbell} phase={1}>
        Routines, a weekly plan, and logging every set with last time&apos;s weights and a rest
        timer.
      </ComingSoon>
    </>
  );
}
