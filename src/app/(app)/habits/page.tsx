import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Water & habits" };

export default function Page() {
  return (
    <>
      <PageHeader title="Water & habits" />
      <ComingSoon icon={Flame} phase={3}>
        One-tap water glasses, daily habits like steps and creatine, and streaks.
      </ComingSoon>
    </>
  );
}
