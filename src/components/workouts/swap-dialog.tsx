"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { equipmentLabel, focusLabel, swapsFor } from "@/lib/exercise-meta";
import type { Exercise } from "@/lib/types";

/**
 * Other exercises that work the same area, for when a machine is missing or
 * taken. "Search all" opens the full list.
 */
export function SwapDialog({
  exercise,
  onOpenChange,
  exercises,
  exclude = [],
  onPick,
  onSearchAll,
}: {
  /** The exercise to swap; null = closed. */
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  /** Ids to leave out, e.g. what's already in the workout. */
  exclude?: string[];
  onPick: (exercise: Exercise) => void;
  onSearchAll: () => void;
}) {
  const options = exercise ? swapsFor(exercise, exercises, exclude) : [];
  return (
    <Dialog open={exercise !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">Swap {exercise?.name}</DialogTitle>
        </DialogHeader>
        {exercise && (
          <>
            <p className="text-muted-foreground -mt-2 text-sm">
              Works the same: {focusLabel(exercise).toLowerCase()}
            </p>
            <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto">
              {options.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onPick(e)}
                    className="hover:bg-muted flex w-full flex-col items-start rounded-md px-2 py-2 text-left"
                  >
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {focusLabel(e)} · {equipmentLabel(e.equipment)}
                    </span>
                  </button>
                </li>
              ))}
              {options.length === 0 && (
                <li className="text-muted-foreground px-2 py-6 text-center text-sm">
                  No close match. Search the full list.
                </li>
              )}
            </ul>
            <Button variant="outline" onClick={onSearchAll}>
              <Search /> Search all exercises
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
