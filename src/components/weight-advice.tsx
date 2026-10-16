import { TrendingDown, TrendingUp, Check } from "lucide-react";
import type { WeightAdvice } from "@/lib/body";
import { cn } from "@/lib/utils";

/** The plan's "how to adjust" rule, applied to your weight trend. */
export function WeightAdviceCard({ advice }: { advice: WeightAdvice }) {
  const Icon = advice.tone === "more" ? TrendingUp : advice.tone === "less" ? TrendingDown : Check;
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
        advice.tone === "keep"
          ? "border-green-600/30 bg-green-600/5"
          : "border-amber-500/40 bg-amber-500/10",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      {advice.text}
    </p>
  );
}
