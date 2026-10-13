import type { Metadata } from "next";
import { Ruler } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Body" };

export default function Page() {
  return (
    <>
      <PageHeader title="Body" />
      <ComingSoon icon={Ruler} phase={4}>
        Weigh-ins, measurements, a weight trend chart and progress photos.
      </ComingSoon>
    </>
  );
}
