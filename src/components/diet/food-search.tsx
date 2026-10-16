"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { matchesFood, perLabel } from "@/lib/nutrition";
import type { Food } from "@/lib/types";

/** Search the food list and pick one. */
export function FoodSearch({
  foods,
  onPick,
  autoFocus = false,
}: {
  foods: Food[];
  onPick: (food: Food) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const hits = useMemo(
    () => (query.trim() ? foods.filter((f) => matchesFood(f.name, query)).slice(0, 20) : []),
    [foods, query],
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods to add"
          aria-label="Search foods to add"
          className="pl-8"
          autoFocus={autoFocus}
        />
      </div>
      {hits.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-md border">
          {hits.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(f);
                  setQuery("");
                }}
                className="hover:bg-muted flex w-full flex-col items-start px-2 py-1.5 text-left"
              >
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-muted-foreground text-xs">
                  {Math.round(f.kcal)} kcal · {perLabel(f)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
