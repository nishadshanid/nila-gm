import { Suspense } from "react";
import { connection } from "next/server";
import { Dumbbell } from "lucide-react";
import { getHousehold } from "@/lib/household";
import { ComingSoon } from "@/components/coming-soon";
import { PersonDot } from "@/components/person-dot";
import { formatDay, todayIST, TZ } from "@/lib/dates";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(
      now,
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function Today() {
  await connection();
  const { me, partner } = await getHousehold();
  const now = new Date();
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold">
          {greeting(now)}, {me.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatDay(todayIST(now), "EEEE d MMMM")}
        </p>
        {partner ? (
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            Training with <PersonDot profile={partner} /> {partner.name}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            Your partner hasn&apos;t been added yet. Create their account in Supabase.
          </p>
        )}
      </div>
      <ComingSoon icon={Dumbbell} phase={1}>
        Today will show your workout, meals, water and habits for the day.
      </ComingSoon>
    </>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
      <Today />
    </Suspense>
  );
}
