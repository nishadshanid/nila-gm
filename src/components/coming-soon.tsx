import type { LucideIcon } from "lucide-react";

/** Placeholder for pages that later phases fill in. */
export function ComingSoon({
  icon: Icon,
  phase,
  children,
}: {
  icon: LucideIcon;
  phase: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <Icon className="text-muted-foreground size-8" />
      <p className="text-muted-foreground max-w-sm text-sm">{children}</p>
      <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs">
        Coming in phase {phase}
      </span>
    </div>
  );
}
