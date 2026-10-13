import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Nila wordmark (black ink, inverted in dark mode) with a green "gym" tag. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Image
        src="/logo.png"
        alt="Nila"
        width={429}
        height={192}
        priority
        className={cn("h-7 w-auto dark:invert", className)}
      />
      <span className="font-heading rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold tracking-wide text-white uppercase">
        Gym
      </span>
    </span>
  );
}
