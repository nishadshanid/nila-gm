"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Segmented } from "@/components/segmented";

const noop = () => () => {};

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  if (!mounted) return <div className="bg-muted h-9 animate-pulse rounded-lg" />;
  return (
    <Segmented
      aria-label="Theme"
      value={(theme as "light" | "dark" | "system") ?? "system"}
      onChange={setTheme}
      options={[
        {
          value: "light",
          label: (
            <>
              <Sun className="size-4" /> Light
            </>
          ),
        },
        {
          value: "dark",
          label: (
            <>
              <Moon className="size-4" /> Dark
            </>
          ),
        },
        {
          value: "system",
          label: (
            <>
              <Monitor className="size-4" /> Auto
            </>
          ),
        },
      ]}
    />
  );
}
