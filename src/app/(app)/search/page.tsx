import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { getHousehold } from "@/lib/household";
import { getExercises, getRoutines } from "@/lib/workouts";
import { getFoods } from "@/lib/diet";
import { equipmentLabel, muscleLabel } from "@/lib/exercise-meta";
import { matchesFood, perLabel } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Search" };

const LIMIT = 20;

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">
        {title} <span className="text-muted-foreground font-normal">{count}</span>
      </h2>
      <ul className="divide-y rounded-xl border">{children}</ul>
    </section>
  );
}

function Row({ href, title, sub }: { href?: string; title: string; sub: string }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">{sub}</span>
      </span>
      {href && <ChevronRight className="text-muted-foreground size-4" />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2.5">
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

async function Results({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 60);
  const { me } = await getHousehold();

  const form = (
    <form action="/search" role="search" className="relative mb-6 max-w-xl">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        name="q"
        defaultValue={q}
        placeholder="Exercises, routines, foods"
        aria-label="Search"
        autoFocus={!q}
        className="pl-8"
      />
    </form>
  );
  if (!q) return form;

  const [exercises, routines, foods] = await Promise.all([
    getExercises(),
    getRoutines(me.id),
    getFoods(),
  ]);
  const ex = exercises.filter((e) =>
    matchesFood(`${e.name} ${muscleLabel(e.muscle)} ${equipmentLabel(e.equipment)}`, q),
  );
  const ro = routines.filter((r) => matchesFood(r.name, q));
  const fo = foods.filter((f) => matchesFood(f.name, q));
  const none = ex.length + ro.length + fo.length === 0;

  return (
    <>
      {form}
      <div className="flex max-w-xl flex-col gap-6">
        {none && (
          <p className="text-muted-foreground text-sm">
            Nothing matches &ldquo;{q}&rdquo;. Try fewer letters, like &ldquo;
            {q.slice(0, 4)}&rdquo;.
          </p>
        )}
        <Group title="Routines" count={ro.length}>
          {ro.slice(0, LIMIT).map((r) => (
            <Row
              key={r.id}
              href={`/workouts/routines/${r.id}`}
              title={r.name}
              sub={`${r.routine_exercises.length} exercises`}
            />
          ))}
        </Group>
        <Group title="Exercises" count={ex.length}>
          {ex.slice(0, LIMIT).map((e) => (
            <Row
              key={e.id}
              href={`/workouts/exercises/${e.id}`}
              title={e.name}
              sub={`${muscleLabel(e.muscle)} · ${equipmentLabel(e.equipment)}`}
            />
          ))}
        </Group>
        <Group title="Foods" count={fo.length}>
          {fo.slice(0, LIMIT).map((f) => (
            <Row
              key={f.id}
              href={f.owner_id === me.id ? "/diet/foods" : undefined}
              title={f.name}
              sub={`${Math.round(f.kcal)} kcal · P ${f.protein_g} · C ${f.carbs_g} · F ${f.fat_g} · ${perLabel(f)}`}
            />
          ))}
        </Group>
      </div>
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHeader title="Search" />
      <Suspense fallback={<div className="bg-muted h-10 max-w-xl animate-pulse rounded-md" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}
