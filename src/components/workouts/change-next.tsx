"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setNextRoutine } from "@/app/(app)/workouts/actions";

/**
 * "What did you train last?" Picks where you are in the cycle (say legs was
 * yesterday), so the routine after it comes up next.
 */
export function ChangeNext({ routines }: { routines: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function pick(index: number) {
    const next = routines[(index + 1) % routines.length];
    startTransition(async () => {
      const r = await setNextRoutine(next.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Up next: ${next.name}`);
      setOpen(false);
    });
  }

  if (routines.length < 2) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground text-sm underline"
      >
        Change
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>What did you train last?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground -mt-2 text-sm">
            The one after it comes up next, then the cycle carries on.
          </p>
          <ul className="-mx-1">
            {routines.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => pick(i)}
                  className="hover:bg-muted flex w-full flex-col items-start rounded-md px-2 py-2 text-left disabled:opacity-50"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground text-xs">
                    Then: {routines[(i + 1) % routines.length].name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" className="self-end" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
