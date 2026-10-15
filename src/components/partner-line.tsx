import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PersonDot } from "@/components/person-dot";
import { createClient } from "@/lib/supabase/server";
import { getHabitDay } from "@/lib/habit-data";
import { formatMl, isMet } from "@/lib/habits";
import type { Profile } from "@/lib/types";

/** One line on Today: how your partner's day is going. Links to their page. */
export async function PartnerLine({ partner, today }: { partner: Profile; today: string }) {
  const supabase = await createClient();
  const [day, workouts, meals] = await Promise.all([
    getHabitDay(partner.id, today, partner.target_water_ml),
    supabase
      .from("workouts")
      .select("name, ended_at")
      .eq("owner_id", partner.id)
      .eq("date", today)
      .order("started_at", { ascending: false })
      .limit(1),
    supabase.from("meal_entries").select("kcal").eq("owner_id", partner.id).eq("date", today),
  ]);
  const w = workouts.data?.[0];
  const kcal = Math.round((meals.data ?? []).reduce((t, m) => t + Number(m.kcal), 0));
  const kept = day.habits.filter((h) => isMet(h, day.values[h.id])).length;
  const parts = [
    w ? (w.ended_at ? `${w.name} done` : `${w.name} in progress`) : "No workout yet",
    kcal ? `${kcal.toLocaleString("en-IN")} kcal` : null,
    `${formatMl(day.water.ml)} water`,
    day.habits.length ? `${kept}/${day.habits.length} habits` : null,
  ].filter(Boolean);

  return (
    <Link
      href="/partner"
      className="bg-card hover:bg-muted/50 mb-6 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
    >
      <PersonDot profile={partner} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{partner.name}</span>
        <span className="text-muted-foreground"> · {parts.join(" · ")}</span>
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
