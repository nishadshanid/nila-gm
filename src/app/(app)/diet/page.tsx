import type { Metadata } from "next";
import { Utensils } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Diet" };

export default function Page() {
  return (
    <>
      <PageHeader title="Diet" />
      <ComingSoon icon={Utensils} phase={2}>
        Daily calorie and protein targets, a food list with Indian foods, and quick meal logging.
      </ComingSoon>
    </>
  );
}
