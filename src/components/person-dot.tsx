import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Small colored dot identifying a partner. */
export function PersonDot({
  profile,
  className,
}: {
  profile: Pick<Profile, "color" | "name">;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      title={profile.name}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: profile.color }}
    />
  );
}
