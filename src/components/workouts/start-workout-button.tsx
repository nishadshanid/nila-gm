"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startWorkout } from "@/app/(app)/workouts/actions";

/** Starts a workout from a routine (or an empty one) and opens the logger. */
export function StartWorkoutButton({
  routineId,
  label = "Start",
  ...props
}: { routineId: string | null; label?: string } & Omit<
  React.ComponentProps<typeof Button>,
  "onClick"
>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() =>
        startTransition(async () => {
          const result = await startWorkout(routineId);
          if (!result.ok) return void toast.error(result.error);
          router.push(`/workouts/log/${result.id}`);
        })
      }
    >
      <Play /> {pending ? "Starting…" : label}
    </Button>
  );
}
