"use client";

import { useMemo, useState } from "react";
import { Segmented } from "@/components/segmented";
import { buildChart, type TrendPoint } from "@/lib/body";
import { addDays, formatDay } from "@/lib/dates";

type Range = "30" | "90" | "all";

const W = 340;
const H = 180;

/** Weigh-ins as dots, the 7-day average as a line. */
export function WeightChart({ trend, today }: { trend: TrendPoint[]; today: string }) {
  const [range, setRange] = useState<Range>("30");
  const shown = useMemo(
    () => (range === "all" ? trend : trend.filter((p) => p.date > addDays(today, -Number(range)))),
    [trend, range, today],
  );
  const chart = useMemo(() => buildChart(shown, W, H), [shown]);

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Weight</h2>
        <Segmented
          value={range}
          onChange={setRange}
          aria-label="Range"
          className="w-48"
          options={[
            { value: "30", label: "30 d" },
            { value: "90", label: "90 d" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          No weigh-ins in this range yet.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Weight from ${shown[0].kg} kg to ${shown.at(-1)!.kg} kg`}
          >
            {chart.ticks.map((t) => (
              <g key={t.kg}>
                <line x1={36} x2={W - 8} y1={t.y} y2={t.y} className="stroke-border" />
                <text
                  x={30}
                  y={t.y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {t.kg}
                </text>
              </g>
            ))}
            {chart.dots.map((d) => (
              <circle key={d.date} cx={d.x} cy={d.y} r={2.5} className="fill-muted-foreground/50" />
            ))}
            <path
              d={chart.line}
              fill="none"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-green-600"
            />
          </svg>
          <div className="text-muted-foreground mt-1 flex justify-between pl-9 text-xs">
            <span>{formatDay(shown[0].date, "d MMM")}</span>
            <span>{formatDay(shown.at(-1)!.date, "d MMM")}</span>
          </div>
          <div className="text-muted-foreground mt-2 flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-muted-foreground/50 size-2 rounded-full" /> Weigh-in
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded bg-green-600" /> 7-day average
            </span>
          </div>
        </>
      )}
    </div>
  );
}
