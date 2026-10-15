import { createElement } from "react";
import { habitIcon } from "@/lib/habit-icons";
import { cn } from "@/lib/utils";

/** A habit's line icon, in a soft circle. */
export function HabitIconView({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full",
        className,
      )}
    >
      {createElement(habitIcon(name), { className: "size-4" })}
    </span>
  );
}
