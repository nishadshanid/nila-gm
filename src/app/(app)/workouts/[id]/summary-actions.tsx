"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confetti } from "@/components/celebrate/confetti";
import { deleteWorkout } from "../actions";

/** Confetti right after finishing (bigger when there are new records). */
export function Celebrate({ records }: { records: number }) {
  useEffect(() => {
    confetti(records > 0 ? 3200 : 1800);
    // Drop ?done=1 so a refresh doesn't celebrate again.
    window.history.replaceState(null, "", window.location.pathname);
  }, [records]);
  return null;
}

export function DeleteWorkoutButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this workout from your history?")) return;
        startTransition(async () => {
          const result = await deleteWorkout(id);
          if (!result.ok) return void toast.error(result.error);
          toast.success("Workout deleted");
          router.push("/workouts");
        });
      }}
    >
      <Trash2 /> Delete workout
    </Button>
  );
}
