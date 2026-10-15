import Link from "next/link";
import type { Nutrients } from "@/lib/types";
import type { Targets } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

function Ring({
  value,
  target,
  size,
  stroke,
  className,
  children,
}: {
  value: number;
  target: number | null;
  size: number;
  stroke: number;
  className: string;
  children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = target ? Math.min(value / target, 1) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {fraction > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * fraction} ${c}`}
            className={cn("transition-[stroke-dasharray] duration-500", className)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        {children}
      </div>
    </div>
  );
}

const MACROS = [
  { key: "protein_g", label: "Protein", ring: "stroke-rose-500" },
  { key: "carbs_g", label: "Carbs", ring: "stroke-amber-500" },
  { key: "fat_g", label: "Fat", ring: "stroke-sky-500" },
] as const;

/** Calories as a big ring, protein / carbs / fat as small ones, against the day's targets. */
export function MacroRings({
  totals,
  targets,
  readOnly = false,
}: {
  totals: Nutrients;
  targets: Targets | null;
  /** Someone else's day: no link to set targets. */
  readOnly?: boolean;
}) {
  const kcalLeft = targets ? targets.kcal - totals.kcal : null;
  return (
    <div className="bg-card flex items-center gap-4 rounded-xl border p-4">
      <Ring
        value={totals.kcal}
        target={targets?.kcal ?? null}
        size={112}
        stroke={10}
        className={kcalLeft !== null && kcalLeft < 0 ? "stroke-orange-500" : "stroke-green-600"}
      >
        <span className="font-heading text-2xl font-semibold tabular-nums">
          {Math.abs(kcalLeft ?? totals.kcal).toLocaleString("en-IN")}
        </span>
        <span className="text-muted-foreground text-xs">
          {kcalLeft === null ? "kcal eaten" : kcalLeft < 0 ? "kcal over" : "kcal left"}
        </span>
      </Ring>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {MACROS.map((m) => {
          const value = totals[m.key];
          const target = targets?.[m.key] ?? null;
          return (
            <div key={m.key} className="flex items-center gap-2.5">
              <Ring value={value} target={target} size={30} stroke={4} className={m.ring}>
                {null}
              </Ring>
              <div className="min-w-0 text-sm leading-tight">
                <p className="font-medium">{m.label}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {Math.round(value)}
                  {target ? ` / ${target}` : ""} g
                </p>
              </div>
            </div>
          );
        })}
        {!targets && !readOnly && (
          <Link href="/diet/targets" className="text-xs underline">
            Set your daily targets
          </Link>
        )}
      </div>
    </div>
  );
}

/** The profile's targets, or null until calories are set. */
export function targetsOf(p: {
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
}): Targets | null {
  if (!p.target_kcal) return null;
  return {
    kcal: p.target_kcal,
    protein_g: p.target_protein_g ?? 0,
    carbs_g: p.target_carbs_g ?? 0,
    fat_g: p.target_fat_g ?? 0,
  };
}
